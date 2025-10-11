import { NextRequest, NextResponse } from 'next/server';
import { getCurrentServerUser, getUserRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentServerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Restrict access to Admin X only (dev feature - reports incomplete)
    const role = getUserRole(user);
    if (role !== 'admin_x') {
      return NextResponse.json({ error: 'Forbidden - This feature is restricted to developers only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get('year') ?? new Date().getFullYear());
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1);

    // Validate month and year
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
    }
    if (year < 2020 || year > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    console.log(`[API /reports/monthly] Fetching monthly report for ${year}-${month}`);
    console.log(`[API /reports/monthly] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch completed service requests for the month
    const serviceRequestsRes = await fetch(`${req.nextUrl.origin}/api/service-request?scope=completed&page=1&pageSize=10000`, {
      headers: {
        'Cookie': req.headers.get('cookie') || '',
      },
    });
    
    if (!serviceRequestsRes.ok) {
      throw new Error('Failed to fetch service requests');
    }
    
    const serviceRequestsData = await serviceRequestsRes.json();
    const allServiceRequests = serviceRequestsData.data || [];

    // Filter service requests by the selected month
    const monthlyServiceRequests = allServiceRequests.filter((sr: any) => {
      const scheduledDate = new Date(sr.scheduledAt);
      return scheduledDate >= startDate && scheduledDate <= endDate && sr.workStatus === 'completed';
    });

    console.log(`[API /reports/monthly] Found ${monthlyServiceRequests.length} completed service requests for the month`);

    // Fetch equipment data for context
    const equipmentRes = await fetch(`${req.nextUrl.origin}/api/equipment?page=1&pageSize=10000`, {
      headers: {
        'Cookie': req.headers.get('cookie') || '',
      },
    });
    
    if (!equipmentRes.ok) {
      throw new Error('Failed to fetch equipment');
    }
    
    const equipmentData = await equipmentRes.json();
    const allEquipment = equipmentData.data || [];

    // Create equipment lookup map
    const equipmentMap = new Map(allEquipment.map((eq: any) => [eq.id, eq]));

    // Calculate key metrics
    const uniqueDevicesMaintained = new Set(monthlyServiceRequests.map((sr: any) => sr.equipmentId)).size;
    
    const totalSparePartsUsed = monthlyServiceRequests.reduce((total: number, sr: any) => {
      return total + (sr.sparePartsNeeded?.reduce((sum: number, part: any) => sum + (part.quantity || 0), 0) || 0);
    }, 0);

    const totalTicketsRaised = monthlyServiceRequests.length;

    // Calculate maintenance types distribution
    const maintenanceTypes = {
      preventive_maintenance: 0,
      corrective_maintenence: 0,
      install: 0,
      assess: 0,
      other: 0,
    };

    monthlyServiceRequests.forEach((sr: any) => {
      const type = sr.requestType;
      if (type in maintenanceTypes) {
        maintenanceTypes[type as keyof typeof maintenanceTypes]++;
      }
    });

    // Calculate location-based activity
    const locationActivity = new Map<string, {
      preventive: number;
      corrective: number;
      install: number;
      assess: number;
      other: number;
    }>();

    monthlyServiceRequests.forEach((sr: any) => {
      const equipment = equipmentMap.get(sr.equipmentId);
      if (equipment) {
        const location = equipment.location || 'Unknown';
        if (!locationActivity.has(location)) {
          locationActivity.set(location, {
            preventive: 0,
            corrective: 0,
            install: 0,
            assess: 0,
            other: 0,
          });
        }
        
        const locationData = locationActivity.get(location)!;
        const type = sr.requestType;
        if (type === 'preventive_maintenance') locationData.preventive++;
        else if (type === 'corrective_maintenence') locationData.corrective++;
        else if (type === 'install') locationData.install++;
        else if (type === 'assess') locationData.assess++;
        else locationData.other++;
      }
    });

    // Prepare devices maintained data
    const devicesMaintained = Array.from(new Set(monthlyServiceRequests.map((sr: any) => sr.equipmentId)))
      .map((equipmentId: string) => {
        const equipment = equipmentMap.get(equipmentId);
        if (!equipment) return null;
        
        // Find the latest maintenance for this equipment in the month
        const latestMaintenance = monthlyServiceRequests
          .filter((sr: any) => sr.equipmentId === equipmentId)
          .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];

        return {
          id: equipment.id,
          name: equipment.name,
          model: equipment.model || '',
          serialNumber: equipment.serialNumber || '',
          location: equipment.location,
          subLocation: equipment.subLocation || '',
          lastMaintenance: latestMaintenance?.scheduledAt || equipment.lastMaintenance,
          status: equipment.status || 'operational',
        };
      })
      .filter(Boolean);

    // Prepare spare parts used data
    const sparePartsUsed = new Map<string, { name: string; quantity: number; devices: string[] }>();

    monthlyServiceRequests.forEach((sr: any) => {
      const equipment = equipmentMap.get(sr.equipmentId);
      const equipmentName = equipment?.name || 'Unknown Device';
      
      if (sr.sparePartsNeeded && Array.isArray(sr.sparePartsNeeded)) {
        sr.sparePartsNeeded.forEach((part: any) => {
          const partName = part.part || part.sparePartName || 'Unknown Part';
          const quantity = part.quantity || 0;
          
          if (quantity > 0) {
            if (!sparePartsUsed.has(partName)) {
              sparePartsUsed.set(partName, { name: partName, quantity: 0, devices: [] });
            }
            
            const existing = sparePartsUsed.get(partName)!;
            existing.quantity += quantity;
            if (!existing.devices.includes(equipmentName)) {
              existing.devices.push(equipmentName);
            }
          }
        });
      }
    });

    const sparePartsArray = Array.from(sparePartsUsed.values());

    // Prepare location summary data
    const locationSummary = Array.from(locationActivity.entries()).map(([location, data]) => ({
      location,
      ...data,
      total: data.preventive + data.corrective + data.install + data.assess + data.other,
    }));

    const reportData = {
      period: {
        year,
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        devicesMaintained: uniqueDevicesMaintained,
        sparePartsUsed: totalSparePartsUsed,
        ticketsRaised: totalTicketsRaised,
      },
      maintenanceTypes: {
        preventive: maintenanceTypes.preventive_maintenance,
        corrective: maintenanceTypes.corrective_maintenence,
        install: maintenanceTypes.install,
        assess: maintenanceTypes.assess,
        other: maintenanceTypes.other,
        total: totalTicketsRaised,
      },
      devicesMaintained,
      sparePartsUsed: sparePartsArray,
      locationSummary,
    };

    console.log(`[API /reports/monthly] Generated report:`, {
      devicesMaintained: reportData.summary.devicesMaintained,
      sparePartsUsed: reportData.summary.sparePartsUsed,
      ticketsRaised: reportData.summary.ticketsRaised,
    });

    return NextResponse.json({ data: reportData });
  } catch (error: unknown) {
    console.error('[API /reports/monthly] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


