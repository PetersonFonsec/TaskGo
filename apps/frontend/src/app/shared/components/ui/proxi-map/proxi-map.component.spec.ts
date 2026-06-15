import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { LEAFLET_IMPORTER, ProxiMapComponent, ProxiMapProvider } from './proxi-map.component';

interface LeafletMock {
  map: jasmine.Spy;
  tileLayer: jasmine.Spy;
  layerGroup: jasmine.Spy;
  marker: jasmine.Spy;
  divIcon: jasmine.Spy;
  latLngBounds: jasmine.Spy;
  mapInstance: any;
  layerGroupInstance: any;
  markers: any[];
}

describe('ProxiMapComponent', () => {
  let fixture: ComponentFixture<ProxiMapComponent>;
  let component: ProxiMapComponent;
  let leafletMock: LeafletMock;
  let leafletImporter: jasmine.Spy;

  function createLeafletMock(): LeafletMock {
    const markers: any[] = [];
    const mapInstance: any = {
      setView: jasmine.createSpy('setView').and.callFake(() => mapInstance),
      fitBounds: jasmine.createSpy('fitBounds').and.callFake(() => mapInstance),
      invalidateSize: jasmine.createSpy('invalidateSize'),
      remove: jasmine.createSpy('remove'),
    };
    const layerGroupInstance: any = {
      addTo: jasmine.createSpy('layerGroup.addTo').and.callFake(() => layerGroupInstance),
      clearLayers: jasmine.createSpy('clearLayers'),
    };
    const tileLayerInstance: any = {
      addTo: jasmine.createSpy('tileLayer.addTo').and.callFake(() => tileLayerInstance),
    };

    return {
      map: jasmine.createSpy('map').and.returnValue(mapInstance),
      tileLayer: jasmine.createSpy('tileLayer').and.returnValue(tileLayerInstance),
      layerGroup: jasmine.createSpy('layerGroup').and.returnValue(layerGroupInstance),
      marker: jasmine.createSpy('marker').and.callFake(() => {
        const marker: any = {
          bindPopup: jasmine.createSpy('bindPopup').and.callFake(() => marker),
          addTo: jasmine.createSpy('marker.addTo').and.callFake(() => marker),
        };
        markers.push(marker);
        return marker;
      }),
      divIcon: jasmine.createSpy('divIcon').and.callFake((options) => options),
      latLngBounds: jasmine.createSpy('latLngBounds').and.callFake((points) => ({ points })),
      mapInstance,
      layerGroupInstance,
      markers,
    };
  }

  async function createComponent(platformId = 'browser') {
    leafletMock = createLeafletMock();
    leafletImporter = jasmine.createSpy('leafletImporter').and.resolveTo(leafletMock as any);

    await TestBed.configureTestingModule({
      imports: [ProxiMapComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: LEAFLET_IMPORTER, useValue: leafletImporter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProxiMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  async function settleMap(): Promise<void> {
    await Promise.resolve();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create with no providers and null user location', async () => {
    await createComponent();

    expect(component).toBeTruthy();
  });

  it('should accept a valid user location without throwing', async () => {
    await createComponent();

    fixture.componentRef.setInput('userLocation', { lat: -23.55052, lng: -46.633308 });

    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('should accept providers matching the local map contract', async () => {
    await createComponent();
    const providers: ProxiMapProvider[] = [
      {
        id: 1,
        name: 'Ana Silva',
        service: 'Eletricista',
        rating: 4.8,
        priceFrom: 120,
        lat: -23.55,
        lng: -46.63,
        premium: true,
        verified: true,
      },
    ];

    fixture.componentRef.setInput('providers', providers);
    fixture.detectChanges();

    expect(component.providers()).toEqual(providers);
  });

  it('should not mark the map ready on a non-browser platform', async () => {
    await createComponent('server');

    fixture.componentRef.setInput('userLocation', { lat: -23.55052, lng: -46.633308 });
    fixture.detectChanges();

    expect(component['mapReady']()).toBeFalse();
    expect(leafletImporter).not.toHaveBeenCalled();
  });

  it('should render fallback text when user location is unavailable', async () => {
    await createComponent();

    const fallback = fixture.nativeElement.querySelector('.proxi-map__fallback');

    expect(fallback).withContext('fallback element exists').not.toBeNull();
    expect(fallback.textContent).toContain('Informe sua localização');
  });

  it('should render an accessible map container', async () => {
    await createComponent();

    const container = fixture.nativeElement.querySelector('.proxi-map__canvas');

    expect(container).withContext('map container exists').not.toBeNull();
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toContain('Mapa');
  });

  it('should initialize Leaflet with OpenStreetMap tiles on browser platform', async () => {
    await createComponent();

    fixture.componentRef.setInput('userLocation', { lat: -23.55052, lng: -46.633308 });
    fixture.detectChanges();
    await settleMap();

    expect(leafletImporter).toHaveBeenCalled();
    expect(leafletMock.map).toHaveBeenCalled();
    expect(leafletMock.tileLayer).toHaveBeenCalledWith(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      jasmine.objectContaining({
        attribution: jasmine.stringMatching(/OpenStreetMap/),
      })
    );
  });

  it('should create user and valid provider markers with custom icons', async () => {
    await createComponent();
    fixture.componentRef.setInput('userLocation', { lat: -23.55052, lng: -46.633308 });
    fixture.componentRef.setInput('providers', [
      {
        id: 1,
        name: 'Ana Silva',
        service: 'Eletricista',
        rating: 4.8,
        priceFrom: 120,
        lat: -23.55,
        lng: -46.63,
        premium: true,
        verified: true,
      },
      {
        id: 2,
        name: 'Sem coordenada',
        service: 'Pintura',
        rating: 4,
        priceFrom: 90,
        lat: Number.NaN,
        lng: -46.6,
      },
    ]);

    fixture.detectChanges();
    await settleMap();

    expect(leafletMock.marker).toHaveBeenCalledTimes(2);
    expect(leafletMock.divIcon).toHaveBeenCalledWith(jasmine.objectContaining({
      className: jasmine.stringMatching(/proxi-map-marker--user/),
    }));
    expect(leafletMock.divIcon).toHaveBeenCalledWith(jasmine.objectContaining({
      className: jasmine.stringMatching(/proxi-map-marker--premium/),
    }));
    expect(leafletMock.divIcon).toHaveBeenCalledWith(jasmine.objectContaining({
      className: jasmine.stringMatching(/proxi-map-marker--verified/),
    }));
  });

  it('should emit the provider id from popup profile action', async () => {
    await createComponent();
    spyOn(component.viewProfile, 'emit');

    fixture.componentRef.setInput('userLocation', { lat: -23.55052, lng: -46.633308 });
    fixture.componentRef.setInput('providers', [
      {
        id: 'provider-1',
        name: 'Ana Silva',
        service: 'Eletricista',
        rating: 4.8,
        priceFrom: 120,
        lat: -23.55,
        lng: -46.63,
      },
    ]);
    fixture.detectChanges();
    await settleMap();

    const providerMarker = leafletMock.markers[1];
    const popup = providerMarker.bindPopup.calls.mostRecent().args[0] as HTMLElement;
    const button = popup.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(component.viewProfile.emit).toHaveBeenCalledWith('provider-1');
  });

  it('should rebuild markers and fit bounds when providers change', async () => {
    await createComponent();

    fixture.componentRef.setInput('userLocation', { lat: -23.55052, lng: -46.633308 });
    fixture.componentRef.setInput('providers', []);
    fixture.detectChanges();
    await settleMap();

    fixture.componentRef.setInput('providers', [
      {
        id: 1,
        name: 'Ana Silva',
        service: 'Eletricista',
        rating: 4.8,
        priceFrom: 120,
        lat: -23.55,
        lng: -46.63,
      },
      {
        id: 2,
        name: 'Bruno Lima',
        service: 'Pintor',
        rating: 4.5,
        priceFrom: 100,
        lat: -23.57,
        lng: -46.65,
      },
    ]);
    fixture.detectChanges();
    await settleMap();

    expect(leafletMock.layerGroupInstance.clearLayers).toHaveBeenCalled();
    expect(leafletMock.mapInstance.fitBounds).toHaveBeenCalled();
  });

  it('should remove Leaflet resources on destroy', async () => {
    await createComponent();

    fixture.componentRef.setInput('userLocation', { lat: -23.55052, lng: -46.633308 });
    fixture.detectChanges();
    await settleMap();

    component.ngOnDestroy();

    expect(leafletMock.layerGroupInstance.clearLayers).toHaveBeenCalled();
    expect(leafletMock.mapInstance.remove).toHaveBeenCalled();
  });
});
