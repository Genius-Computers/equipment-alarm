import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';
import { getDb, bulkInsertPmServiceRequests } from '@/lib/db';
import { ensureSchema } from '@/lib/db/schema';
import {
	ServiceRequestApprovalStatus,
	ServiceRequestPriority,
	ServiceRequestType,
	ServiceRequestWorkStatus,
} from '@/lib/types';

function isPmManagerRole(role: string | null): boolean {
	return role === 'admin' || role === 'admin_x' || role === 'supervisor';
}

/**
 * GET handler kept for backward compatibility with older clients.
 * New PM UI does not rely on interval-based overdue calculations,
 * so this now returns an empty list for authorized users.
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getCurrentServerUser(req);
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const role = getUserRole(user);
		// Allow technicians and managers; block end users
		if (!role || role === 'end_user') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		return NextResponse.json({ data: [] });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unexpected error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * POST: Given a set of equipment IDs, create PM service requests (tickets)
 * for those that do not already have an open PM. No interval/overdue checks.
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getCurrentServerUser(req);
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const role = getUserRole(user);
		if (!isPmManagerRole(role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Ensure full database schema (including assigned_technician_ids, pm_details, etc.)
		await ensureSchema();

		const body = (await req.json().catch(() => null)) as { equipmentIds?: string[]; preview?: boolean } | null;
		const equipmentIds = Array.isArray(body?.equipmentIds) ? body!.equipmentIds : [];
		const preview = Boolean(body?.preview);

		if (!equipmentIds.length) {
			return NextResponse.json({ error: 'equipmentIds array is required' }, { status: 400 });
		}

		// Hard cap to avoid accidentally creating an extremely large batch
		if (equipmentIds.length > 1000) {
			return NextResponse.json(
				{ error: 'Too many equipment items in one batch. Please split into smaller runs (max 1000).' },
				{ status: 400 },
			);
		}

		const sql = getDb();

		// Fetch only the selected equipment rows (no maintenance interval requirement)
		const equipmentRows = await sql`
      select id, name
      from equipment
      where
        deleted_at is null
        and id = any(${equipmentIds}::uuid[])
    ` as Array<{ id: string; name: string }>;

		// Short-circuit if none of the provided IDs resolved to equipment
		if (!equipmentRows.length) {
			return NextResponse.json({ data: { created: 0, skippedExisting: 0, createdRequestIds: [] } });
		}

		// Fetch all existing "open" PM requests for these equipment in a single query.
		// We align "open" with the same semantics as the Service Requests page's
		// pending scope: approval_status = 'pending' OR (approval_status = 'approved' AND work_status = 'pending').
		const existingRows = await sql`
      select equipment_id
      from service_request
      where deleted_at is null
        and request_type = ${ServiceRequestType.PREVENTIVE_MAINTENANCE}
        and (
          approval_status = ${ServiceRequestApprovalStatus.PENDING}
          or (approval_status = ${ServiceRequestApprovalStatus.APPROVED} and work_status = ${ServiceRequestWorkStatus.PENDING})
        )
        and equipment_id = any(${equipmentRows.map((e) => e.id)}::uuid[])
    ` as Array<{ equipment_id: string }>;

		const existingEquipmentIds = new Set(existingRows.map((r) => r.equipment_id));

		// Partition into equipments that already have an open PM and those that don't
		let skippedExisting = 0;
		const toCreate: Array<{ id: string; name: string }> = [];
		for (const eq of equipmentRows) {
			if (existingEquipmentIds.has(eq.id)) {
				skippedExisting++;
			} else {
				toCreate.push(eq);
			}
		}

		const toCreateCount = toCreate.length;

		// Preview mode: compute ticket range but do not create any tickets
		if (preview) {
			if (toCreateCount === 0) {
				return NextResponse.json({
					data: {
						created: 0,
						skippedExisting,
						createdRequestIds: [],
						preview: {
							countToCreate: 0,
							firstTicketId: null,
							lastTicketId: null,
						},
					},
				});
			}

			const now = new Date();
			const yy = String(now.getFullYear()).slice(-2);
			const yearPrefix = yy;

			const rows = await sql`
        select coalesce(max(
          case 
            when ticket_id is not null and ticket_id like ${yearPrefix + '-%'}
            then (split_part(ticket_id, '-', 2))::int
            else 0
          end
        ), 0) as max_suffix
        from service_request
      ` as Array<{ max_suffix: number }>;

			const maxSuffix = (rows?.[0]?.max_suffix ?? 0) as number;
			const start = (Number.isFinite(maxSuffix) ? maxSuffix : 0) + 1;
			const end = start + toCreateCount - 1;
			const formatId = (n: number) => `${yearPrefix}-${String(n).padStart(4, "0")}`;

			const firstTicketId = formatId(start);
			const lastTicketId = formatId(end);

			return NextResponse.json({
				data: {
					created: 0,
					skippedExisting,
					createdRequestIds: [],
					preview: {
						countToCreate: toCreateCount,
						firstTicketId,
						lastTicketId,
					},
				},
			});
		}

		const inserted = await bulkInsertPmServiceRequests(
			toCreate.map((eq) => ({ equipmentId: eq.id, equipmentName: eq.name })),
			user.id,
		);

		const created = inserted.length;
		const createdRequestIds = inserted.map((r) => r.id);

		return NextResponse.json({ data: { created, skippedExisting, createdRequestIds } });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unexpected error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

