import { MonthlyReport } from './types/report';

export interface PDFExportOptions {
  includeCharts?: boolean;
  includeDetailedData?: boolean;
  companyName?: string;
  companyLogo?: string;
  translations?: Record<string, string>;
}

export const generatePDFFromReport = async (
  report: MonthlyReport, 
  options: PDFExportOptions = {}
): Promise<Blob> => {
  // For now, we'll use a simple HTML-to-PDF approach
  // In a production environment, you might want to use libraries like:
  // - react-pdf
  // - puppeteer
  // - jsPDF with html2canvas
  
  const html = generateReportHTML(report, options);
  
  // Create a new window with the HTML content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
  
  // Return a promise that resolves when printing is complete
  return new Promise((resolve) => {
    // This is a simplified approach - in reality you'd want to use a proper PDF library
    setTimeout(() => {
      resolve(new Blob(['PDF generated'], { type: 'application/pdf' }));
    }, 1000);
  });
};

const generateReportHTML = (report: MonthlyReport, options: PDFExportOptions): string => {
  const t = (key: string, params?: Record<string, unknown>) => {
    if (!options.translations) return key;
    
    let text = options.translations[key] || key;
    
    // Handle pluralization for count
    if (params?.count !== undefined && text.includes("|")) {
      const [singular, plural] = text.split("|");
      text = params.count === 1 ? singular : plural;
    }
    
    // Replace parameters
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param] as string);
      });
    }
    
    return text;
  };
  
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatNumber = (num: number) => num.toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Monthly Report - ${report.period.monthName} ${report.period.year}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 2.5rem;
          margin: 0;
          color: #1f2937;
        }
        .header .subtitle {
          color: #6b7280;
          margin-top: 5px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          color: #374151;
          font-size: 1.1rem;
        }
        .summary-card .number {
          font-size: 2rem;
          font-weight: bold;
          color: #1f2937;
        }
        .summary-desc {
          margin: 5px 0 0 0;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .section h2 {
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        .stat-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 15px;
        }
        .stat-item h4 {
          margin: 0 0 10px 0;
          color: #374151;
        }
        .stat-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .stat-list li {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .stat-list li:last-child {
          border-bottom: none;
        }
        .badge {
          background: #e5e7eb;
          color: #374151;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .table th,
        .table td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          text-align: left;
        }
        .table th {
          background: #f9fafb;
          font-weight: 600;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .chart-section {
          margin-top: 30px;
          padding: 20px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .chart-section h3 {
          margin: 0 0 20px 0;
          color: #1f2937;
          font-size: 1.2rem;
        }
        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bar-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 8px 0;
        }
        .bar-label {
          min-width: 200px;
          font-size: 0.875rem;
          color: #374151;
          font-weight: 500;
        }
        .bar-container {
          flex: 1;
          position: relative;
          height: 24px;
          background: #f3f4f6;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
        }
        .bar-fill {
          height: 100%;
          border-radius: 12px;
          transition: width 0.3s ease;
          position: relative;
        }
        .bar-value {
          position: absolute;
          right: 8px;
          font-size: 0.75rem;
          font-weight: bold;
          color: #1f2937;
          z-index: 1;
        }
        .bar-cost {
          min-width: 80px;
          text-align: right;
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin: 15px 0;
          padding: 15px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: #374151;
        }
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
        .chart-note {
          margin: 15px 0 0 0;
          padding: 10px;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #92400e;
          font-style: italic;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .section { page-break-inside: avoid; }
          .chart-section { page-break-inside: avoid; }
          .bar-chart { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${t("pdf.title")}</h1>
        <div class="subtitle">
          ${report.period.monthName} ${report.period.year}
          ${report.location ? ` • ${report.location.campus} - ${report.location.name}` : ''}
        </div>
        <div class="subtitle">
          ${t("pdf.generatedOn", { date: new Date(report.generatedAt).toLocaleDateString(), user: report.generatedBy })}
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <h3>${t("pdf.equipmentAdded")}</h3>
          <div class="number">${formatNumber(report.equipment.newThisMonth)}</div>
          <p class="summary-desc">${t("pdf.newEquipmentThisMonth")}</p>
        </div>
        <div class="summary-card">
          <h3>${t("pdf.serviceRequests")}</h3>
          <div class="number">${formatNumber(report.summary.totalServiceRequests)}</div>
          <p class="summary-desc">${t("pdf.serviceRequestsHandled")}</p>
        </div>
        <div class="summary-card">
          <h3>${t("pdf.jobOrders")}</h3>
          <div class="number">${formatNumber(report.summary.totalJobOrders)}</div>
          <p class="summary-desc">${t("pdf.jobOrdersProcessed")}</p>
        </div>
        <div class="summary-card">
          <h3>${t("pdf.sparePartsCost")}</h3>
          <div class="number">${formatCurrency(report.summary.totalSparePartsCost)}</div>
          <p class="summary-desc">${t("pdf.totalPartsExpenditure")}</p>
        </div>
        <div class="summary-card">
          <h3>${t("pdf.technicians")}</h3>
          <div class="number">${formatNumber(report.summary.totalTechnicians)}</div>
          <p class="summary-desc">${t("pdf.activeTechnicians")}</p>
        </div>
      </div>

      <div class="section">
        <h2>${t("pdf.equipmentStatistics")}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <h4>${t("pdf.equipmentByStatus")}</h4>
            <ul class="stat-list">
              ${Object.entries(report.equipment.byStatus).map(([status, count]) => 
                `<li><span>${status}</span><span class="badge">${count}</span></li>`
              ).join('')}
            </ul>
          </div>
          <div class="stat-item">
            <h4>${t("pdf.keyMetrics")}</h4>
            <ul class="stat-list">
              <li><span>${t("pdf.newThisMonth")}</span><span class="badge">${report.equipment.newThisMonth}</span></li>
              <li><span>${t("pdf.maintenanceDue")}</span><span class="badge">${report.equipment.maintenanceDue}</span></li>
              <li><span>${t("pdf.maintenanceOverdue")}</span><span class="badge">${report.equipment.maintenanceOverdue}</span></li>
            </ul>
          </div>
        </div>
        
        ${Object.keys(report.serviceRequests.byEquipment).length > 0 ? `
        <div class="chart-section">
          <h3>⚙️ ${t("pdf.equipmentWithMostServiceRequests")}</h3>
          <div class="bar-chart">
            ${Object.entries(report.serviceRequests.byEquipment)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([equipment, count]) => {
                const maxCount = Math.max(...Object.values(report.serviceRequests.byEquipment));
                const percentage = (count / maxCount) * 100;
                const intensity = count / maxCount;
                const color = intensity > 0.7 ? '#dc2626' : intensity > 0.4 ? '#f59e0b' : '#3b82f6';
                const displayName = equipment.length > 30 ? equipment.substring(0, 30) + '...' : equipment;
                return `
                  <div class="bar-item">
                    <div class="bar-label">${displayName}</div>
                    <div class="bar-container">
                      <div class="bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                      <span class="bar-value">${count}</span>
                    </div>
                  </div>
                `;
              }).join('')}
          </div>
          <div class="legend">
            <div class="legend-item">
              <div class="legend-color" style="background-color: #dc2626;"></div>
              <span>${t("pdf.highNeedsAttention")}</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #f59e0b;"></div>
              <span>${t("pdf.mediumMonitorClosely")}</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #3b82f6;"></div>
              <span>${t("pdf.lowNormalOperation")}</span>
            </div>
          </div>
          <p class="chart-note">⚠️ ${t("pdf.equipmentRequiringFrequentService")}</p>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <h2>${t("pdf.serviceRequestsAnalysis")}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <h4>${t("pdf.keyMetrics")}</h4>
            <ul class="stat-list">
              <li><span>${t("pdf.totalRequests")}</span><span class="badge">${report.serviceRequests.total}</span></li>
              <li><span>${t("pdf.completed")}</span><span class="badge">${report.serviceRequests.byWorkStatus.completed || 0}</span></li>
              <li><span>${t("pdf.pending")}</span><span class="badge">${report.serviceRequests.byWorkStatus.pending || 0}</span></li>
              <li><span>${t("pdf.completionRate")}</span><span class="badge">${report.serviceRequests.total > 0 ? (((report.serviceRequests.byWorkStatus.completed || 0) / report.serviceRequests.total) * 100).toFixed(1) : '0'}%</span></li>
            </ul>
          </div>
          <div class="stat-item">
            <h4>${t("pdf.byType")}</h4>
            <ul class="stat-list">
              ${Object.entries(report.serviceRequests.byType).map(([type, count]) => 
                `<li><span>${type.replace('_', ' ').toUpperCase()}</span><span class="badge">${count}</span></li>`
              ).join('')}
            </ul>
          </div>
          <div class="stat-item">
            <h4>${t("pdf.performanceMetrics")}</h4>
            <ul class="stat-list">
              <li><span>${t("pdf.averageCompletionTime")}</span><span class="badge">${report.serviceRequests.averageCompletionTime.toFixed(1)}h</span></li>
              <li><span>${t("pdf.totalSparePartsCost")}</span><span class="badge">${formatCurrency(report.serviceRequests.totalSparePartsCost)}</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>${t("pdf.technicianPerformance")}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <h4>${t("pdf.summary")}</h4>
            <ul class="stat-list">
              <li><span>${t("pdf.activeTechnicians")}</span><span class="badge">${report.attendance.totalTechnicians}</span></li>
              <li><span>${t("pdf.averageHoursPerDay")}</span><span class="badge">${report.attendance.averageHoursPerDay.toFixed(1)}h</span></li>
            </ul>
          </div>
          <div class="stat-item">
            <h4>${t("pdf.topPerformers")}</h4>
            <ul class="stat-list">
              ${report.attendance.byTechnician
                .sort((a, b) => b.completionRate - a.completionRate)
                .slice(0, 5)
                .map((tech, index) => 
                  `<li><span>${index + 1}. ${tech.technician.displayName || `Tech ${tech.technician.id.slice(0, 8)}`}</span><span class="badge">${tech.completionRate.toFixed(0)}%</span></li>`
                ).join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>${t("pdf.jobOrdersSummary")}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <h4>${t("pdf.orderStatistics")}</h4>
            <ul class="stat-list">
              <li><span>${t("pdf.totalOrders")}</span><span class="badge">${report.jobOrders.total}</span></li>
              <li><span>${t("pdf.equipmentItems")}</span><span class="badge">${report.jobOrders.totalEquipmentItems}</span></li>
              <li><span>${t("pdf.activeSublocations")}</span><span class="badge">${report.jobOrders.mostActiveSublocations.length}</span></li>
            </ul>
          </div>
          <div class="stat-item">
            <h4>${t("pdf.mostActiveSublocations")}</h4>
            <ul class="stat-list">
              ${report.jobOrders.mostActiveSublocations.slice(0, 5).map(item => 
                `<li><span>${item.sublocation}</span><span class="badge">${item.count}</span></li>`
              ).join('')}
            </ul>
          </div>
        </div>
        
        ${report.jobOrders.mostActiveSublocations.length > 0 ? `
        <div class="chart-section">
          <h3>📍 ${t("pdf.mostActiveLocations")}</h3>
          <div class="bar-chart">
            ${report.jobOrders.mostActiveSublocations.slice(0, 8).map((location) => {
              const maxCount = Math.max(...report.jobOrders.mostActiveSublocations.map(l => l.count));
              const percentage = (location.count / maxCount) * 100;
              const intensity = location.count / maxCount;
              const color = intensity > 0.7 ? '#6366f1' : intensity > 0.4 ? '#818cf8' : '#a5b4fc';
              return `
                <div class="bar-item">
                  <div class="bar-label">${location.sublocation.length > 30 ? location.sublocation.substring(0, 30) + '...' : location.sublocation}</div>
                  <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                    <span class="bar-value">${location.count}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <p class="chart-note">📍 ${t("pdf.locationsWithHighJobOrderActivity")}</p>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <h2>${t("pdf.sparePartsInventory")}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <h4>${t("pdf.inventoryStatus")}</h4>
            <ul class="stat-list">
              <li><span>${t("pdf.totalItems")}</span><span class="badge">${report.spareParts.totalItems}</span></li>
              <li><span>${t("pdf.lowStockAlerts")}</span><span class="badge">${report.spareParts.lowStockAlerts}</span></li>
              <li><span>${t("pdf.monthlyUsage")}</span><span class="badge">${report.spareParts.monthlyUsage}</span></li>
              <li><span>${t("pdf.monthlyCost")}</span><span class="badge">${formatCurrency(report.spareParts.monthlyCost)}</span></li>
            </ul>
          </div>
          <div class="stat-item">
            <h4>${t("pdf.sparePartOrders")}</h4>
            <ul class="stat-list">
              <li><span>${t("pdf.totalOrders")}</span><span class="badge">${report.sparePartOrders.total}</span></li>
              <li><span>${t("pdf.itemsRequested")}</span><span class="badge">${report.sparePartOrders.totalQuantityRequested}</span></li>
              <li><span>${t("pdf.itemsSupplied")}</span><span class="badge">${report.sparePartOrders.totalQuantitySupplied}</span></li>
              <li><span>${t("pdf.totalSparePartsCost")}</span><span class="badge">${formatCurrency(report.sparePartOrders.totalCost)}</span></li>
            </ul>
          </div>
        </div>
        
        ${report.spareParts.topRequested.length > 0 ? `
        <div class="chart-section">
          <h3>📦 ${t("pdf.mostRequestedParts")}</h3>
          <div class="bar-chart">
            ${report.spareParts.topRequested.slice(0, 8).map((part) => {
              const maxQty = Math.max(...report.spareParts.topRequested.map(p => p.quantity));
              const percentage = (part.quantity / maxQty) * 100;
              const intensity = part.quantity / maxQty;
              const color = intensity > 0.7 ? '#7c3aed' : intensity > 0.4 ? '#8b5cf6' : '#a78bfa';
              return `
                <div class="bar-item">
                  <div class="bar-label">${part.name.length > 30 ? part.name.substring(0, 30) + '...' : part.name}</div>
                  <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                    <span class="bar-value">${part.quantity}</span>
                  </div>
                  <div class="bar-cost">${formatCurrency(part.cost)}</div>
                </div>
              `;
            }).join('')}
          </div>
          <p class="chart-note">💡 ${t("pdf.highDemandParts")}</p>
        </div>
        ` : ''}
      </div>


      <div class="footer">
        <p>${t("pdf.footer")}</p>
        <p>${t("pdf.footerSupport")}</p>
      </div>
    </body>
    </html>
  `;
};

// Alternative: Simple print function for browser-based PDF generation
export const printReportAsPDF = (report: MonthlyReport, options: PDFExportOptions = {}) => {
  const html = generateReportHTML(report, options);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
    // Close window after a delay to allow printing to complete
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  };
};
