'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

interface MonthlyReportFiltersProps {
  onGenerate: (filters: { month: number; year: number; locationId?: string }) => void;
  loading?: boolean;
}

export function MonthlyReportFilters({ onGenerate, loading = false }: MonthlyReportFiltersProps) {
  const { t } = useLanguage();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [locationId, setLocationId] = useState<string>('all');
  const [locations, setLocations] = useState<Array<{ id: string; name: string; campus: string }>>([]);

  // Fetch locations on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };

    fetchLocations();
  }, []);

  const handleGenerate = () => {
    onGenerate({
      month,
      year,
      locationId: locationId === 'all' ? undefined : locationId
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reports.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Month Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports.month')}</label>
            <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder={t('reports.selectMonth')} />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports.year')}</label>
            <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder={t('reports.selectYear')} />
              </SelectTrigger>
              <SelectContent>
                {years.map((yearOption) => (
                  <SelectItem key={yearOption} value={yearOption.toString()}>
                    {yearOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports.location')}</label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder={t('reports.allLocations')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('reports.allLocations')}</SelectItem>
                {(locations || []).map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.campus} - {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? t('reports.generating') : t('reports.generate')}
          </Button>
        </div>

        {/* Selected Period Display */}
        <div className="text-sm text-muted-foreground">
          {t('reports.reportPeriod')}: {monthNames[month - 1]} {year}
          {locationId !== 'all' && (
            <span>
              {' '}• {locations.find(l => l.id === locationId)?.campus} - {locations.find(l => l.id === locationId)?.name}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

