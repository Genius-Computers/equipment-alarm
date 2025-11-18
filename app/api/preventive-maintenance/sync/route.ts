import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';
import { getDb, insertServiceRequest } from '@/lib/db';
import { ensurePmDetailsColumn } from '@/lib/db/schema';
import { deriveMaintenanceInfo } from '@/lib/utils';
import {
	ServiceRequestApprovalStatus,
	ServiceRequestPriority,
	ServiceRequestType,
	ServiceRequestWorkStatus,
} from '@/lib/types';

type OverdueEquipmentResponseItem = {
	id: string;
	name: string;
	partNumber: string | null;
	model: string | null;
	manufacturer: string | null;
	serialNumber: string | null;
	location: string | null;
	subLocation: string | null;
	locationId: string | null;
	locationName: string | null;
	campus: string | null;
	lastMaintenance: string | null;
	maintenanceInterval: string | null;
	nextMaintenance: string;
	overdueDays: number;
};

function isPmManagerRole(role: string | null): boolean {
	return role === 'admin' || role === 'admin_x' || role === 'supervisor';
}

/**
 * GET: List equipment that are overdue for preventive maintenance and
 * do NOT already have a pending PM service request.
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getCurrentServerUser(req);
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const role = getUserRole(user);
		// Allow technicians and managers to view overdue equipment; block end users
		if (!role || role === 'end_user') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const sql = getDb();

		// Fetch equipment with maintenance interval set, including location info
		const equipmentRows = await sql`
      select
        e.id,
        e.name,
        e.part_number,
        e.model,
        e.manufacturer,
        e.serial_number,
        e.location,
        e.sub_location,
        e.location_id,
        e.last_maintenance,
        e.maintenance_interval,
        l.name as location_name,
        l.campus
      from equipment e
      left join locations l on e.location_id = l.id and l.deleted_at is null
      where
        e.deleted_at is null
        and e.maintenance_interval is not null
    ` as Array<{
			id: string;
			name: string;
			part_number: string | null;
			model: string | null;
			manufacturer: string | null;
			serial_number: string | null;
			location: string | null;
			sub_location: string | null;
			location_id: string | null;
			last_maintenance: string | null;
			maintenance_interval: string | null;
			location_name: string | null;
			campus: string | null;
		}>;

		const overdue: OverdueEquipmentResponseItem[] = [];

		for (const eq of equipmentRows) {
			const status = deriveMaintenanceInfo({
				lastMaintenance: eq.last_maintenance || undefined,
				maintenanceInterval: eq.maintenance_interval || undefined,
			});

			if (status.maintenanceStatus !== 'overdue') continue;

			// Check if an open PM request already exists for this equipment
			const existing = await sql`
        select id from service_request
        where deleted_at is null
          and equipment_id = ${eq.id}
          and request_type = ${ServiceRequestType.PREVENTIVE_MAINTENANCE}
          and work_status = ${ServiceRequestWorkStatus.PENDING}
        limit 1
      ` as Array<{ id: string }>;

			if (existing && existing.length > 0) {
				continue;
			}

			const overdueDays = Math.abs(status.daysUntil);

			overdue.push({
				id: eq.id,
				name: eq.name,
				partNumber: eq.part_number,
				model: eq.model,
				manufacturer: eq.manufacturer,
				serialNumber: eq.serial_number,
				location: eq.location,
				subLocation: eq.sub_location,
				locationId: eq.location_id,
				locationName: eq.location_name,
				campus: eq.campus,
				lastMaintenance: eq.last_maintenance,
				maintenanceInterval: eq.maintenance_interval,
				nextMaintenance: status.nextMaintenance,
				overdueDays,
			});
		}

		return NextResponse.json({ data: overdue });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unexpected error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * POST: Given a set of equipment IDs, create PM service requests
 * (tickets) for those that are overdue and do not already have an open PM.
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

		// Ensure pm_details column exists before proceeding (for future PM forms)
		await ensurePmDetailsColumn();

		const body = (await req.json().catch(() => null)) as { equipmentIds?: string[] } | null;
		const equipmentIds = Array.isArray(body?.equipmentIds) ? body!.equipmentIds : [];

		if (!equipmentIds.length) {
			return NextResponse.json({ error: 'equipmentIds array is required' }, { status: 400 });
		}

		const sql = getDb();

		// Fetch only the selected equipment rows
		const equipmentRows = await sql`
      select id, name, last_maintenance, maintenance_interval
      from equipment
      where
        deleted_at is null
        and maintenance_interval is not null
        and id = any(${equipmentIds}::uuid[])
    ` as Array<{ id: string; name: string; last_maintenance: string | null; maintenance_interval: string | null }>;

		let created = 0;
		let skippedExisting = 0;
		const createdRequestIds: string[] = [];

		for (const eq of equipmentRows) {
			const status = deriveMaintenanceInfo({
				lastMaintenance: eq.last_maintenance || undefined,
				maintenanceInterval: eq.maintenance_interval || undefined,
			});

			// Only create tickets for still-overdue equipment
			if (status.maintenanceStatus !== 'overdue') {
				continue;
			}

			// Check if an open PM request already exists for this equipment
			const existing = await sql`
        select id from service_request
        where deleted_at is null
          and equipment_id = ${eq.id}
          and request_type = ${ServiceRequestType.PREVENTIVE_MAINTENANCE}
          and work_status = ${ServiceRequestWorkStatus.PENDING}
        limit 1
      ` as Array<{ id: string }>;

			if (existing && existing.length > 0) {
				skippedExisting++;
				continue;
			}

			// Create new PM service request (no job order, ticket will be assigned automatically)
			// PM requests are auto-approved - no approval needed for technicians to start work
			const row = await insertServiceRequest(
				{
					equipment_id: eq.id,
					// Start unassigned; allow technicians to self-assign later
					assigned_technician_id: undefined,
					request_type: ServiceRequestType.PREVENTIVE_MAINTENANCE,
					scheduled_at: new Date().toISOString(),
					priority: ServiceRequestPriority.MEDIUM,
					approval_status: ServiceRequestApprovalStatus.APPROVED,
					work_status: ServiceRequestWorkStatus.PENDING,
					problem_description: `Preventive maintenance for ${eq.name}`,
					technical_assessment: null as unknown as undefined,
					recommendation: null as unknown as undefined,
					spare_parts_needed: null as unknown as undefined,
					approval_note: null as unknown as undefined,
					pm_details: null as unknown as undefined,
					ticket_id: undefined,
				},
				user.id,
			);

			created++;
			if (row?.id) createdRequestIds.push(row.id as unknown as string);
		}

		return NextResponse.json({ data: { created, skippedExisting, createdRequestIds } });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unexpected error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

