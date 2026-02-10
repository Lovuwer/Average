jest.mock('react-native-html-to-pdf', () => ({
  default: {
    convert: jest.fn().mockResolvedValue({ filePath: '/tmp/test.pdf' }),
  },
}), { virtual: true });

jest.mock('react-native-share', () => ({
  default: {
    open: jest.fn().mockResolvedValue(true),
  },
}), { virtual: true });

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp/docs',
  writeFile: jest.fn().mockResolvedValue(true),
}), { virtual: true });

import { TripExportService, TripExportData } from '../../../../src/services/export/TripExportService';

describe('TripExportService', () => {
  let service: TripExportService;
  const sampleTrip: TripExportData = {
    id: 'trip-123',
    date: '2024-01-15',
    startTime: '08:30',
    endTime: '09:15',
    duration: '00:45:00',
    distance: '42.5 km',
    averageSpeed: '85 km/h',
    maxSpeed: '142 km/h',
    speedUnit: 'km/h',
  };

  beforeEach(() => {
    service = new TripExportService();
    jest.clearAllMocks();
  });

  it('generateSingleTripHTML returns valid HTML string', () => {
    const html = service.generateSingleTripHTML(sampleTrip);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('generateSingleTripHTML includes trip date', () => {
    const html = service.generateSingleTripHTML(sampleTrip);
    expect(html).toContain('2024-01-15');
  });

  it('generateSingleTripHTML includes average speed', () => {
    const html = service.generateSingleTripHTML(sampleTrip);
    expect(html).toContain('85 km/h');
  });

  it('generateSingleTripHTML includes max speed', () => {
    const html = service.generateSingleTripHTML(sampleTrip);
    expect(html).toContain('142 km/h');
  });

  it('generateSingleTripHTML includes distance', () => {
    const html = service.generateSingleTripHTML(sampleTrip);
    expect(html).toContain('42.5 km');
  });

  it('generateSingleTripHTML includes duration', () => {
    const html = service.generateSingleTripHTML(sampleTrip);
    expect(html).toContain('00:45:00');
  });

  it('generateMultiTripsHTML includes all trips in table', () => {
    const trips = [sampleTrip, { ...sampleTrip, id: 'trip-456', date: '2024-01-16' }];
    const html = service.generateMultiTripsHTML(trips);
    expect(html).toContain('2024-01-15');
    expect(html).toContain('2024-01-16');
  });

  it('generateMultiTripsHTML shows correct trip count', () => {
    const trips = [sampleTrip, { ...sampleTrip, id: 'trip-456' }];
    const html = service.generateMultiTripsHTML(trips);
    expect(html).toContain('2 trips recorded');
  });

  it('generateCSV returns valid CSV with header row', () => {
    const csv = service.generateCSV([sampleTrip]);
    expect(csv.startsWith('Date,Start Time,End Time,Duration,Distance,Average Speed,Max Speed,Unit')).toBe(true);
  });

  it('generateCSV has correct number of data rows', () => {
    const trips = [sampleTrip, { ...sampleTrip, id: 'trip-456' }];
    const csv = service.generateCSV(trips);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 data rows
  });

  it('generateCSV includes all fields per trip', () => {
    const csv = service.generateCSV([sampleTrip]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('2024-01-15');
    expect(dataLine).toContain('08:30');
    expect(dataLine).toContain('09:15');
    expect(dataLine).toContain('00:45:00');
  });

  it('handles empty trips array for CSV', () => {
    const csv = service.generateCSV([]);
    expect(csv).toBe('Date,Start Time,End Time,Duration,Distance,Average Speed,Max Speed,Unit');
  });

  it('handles empty trips array for multi HTML', () => {
    const html = service.generateMultiTripsHTML([]);
    expect(html).toContain('No trips recorded');
  });

  it('handles special characters in trip data', () => {
    const trip = { ...sampleTrip, date: 'Jan <15> & "2024"' };
    const html = service.generateSingleTripHTML(trip);
    expect(html).toContain('&lt;15&gt;');
    expect(html).toContain('&amp;');
  });

  it('exportSingleTripPDF calls RNHTMLtoPDF.convert', async () => {
    await service.exportSingleTripPDF(sampleTrip);
    const RNHTMLtoPDF = require('react-native-html-to-pdf').default;
    expect(RNHTMLtoPDF.convert).toHaveBeenCalled();
  });

  it('exportSingleTripPDF calls Share.open with file path', async () => {
    await service.exportSingleTripPDF(sampleTrip);
    const Share = require('react-native-share').default;
    expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('/tmp/test.pdf'),
      type: 'application/pdf',
    }));
  });

  it('exportTripsCSV writes file', async () => {
    await service.exportTripsCSV([sampleTrip]);
    const RNFS = require('react-native-fs');
    expect(RNFS.writeFile).toHaveBeenCalled();
  });

  it('exportTripsCSV calls Share.open', async () => {
    await service.exportTripsCSV([sampleTrip]);
    const Share = require('react-native-share').default;
    expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
      type: 'text/csv',
    }));
  });
});
