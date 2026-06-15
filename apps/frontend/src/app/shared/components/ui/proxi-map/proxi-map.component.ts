import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  InjectionToken,
  OnDestroy,
  PLATFORM_ID,
  ViewEncapsulation,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { DivIcon, LatLngExpression, LayerGroup, Map as LeafletMap, Marker } from 'leaflet';

type LeafletModule = typeof import('leaflet');

export const LEAFLET_IMPORTER = new InjectionToken<() => Promise<LeafletModule>>(
  'LEAFLET_IMPORTER',
  {
    providedIn: 'root',
    factory: () => () => import('leaflet'),
  }
);

export interface ProxiMapLocation {
  lat: number;
  lng: number;
}

export interface ProxiMapProvider {
  id: number | string;
  name: string;
  service: string;
  rating: number;
  priceFrom: number;
  lat: number;
  lng: number;
  distanceKm?: number;
  photoUrl?: string;
  premium?: boolean;
  verified?: boolean;
}

@Component({
  selector: 'app-proxi-map',
  standalone: true,
  templateUrl: './proxi-map.component.html',
  styleUrl: './proxi-map.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProxiMapComponent implements AfterViewInit, DoCheck, OnDestroy {
  readonly #platformId = inject(PLATFORM_ID);
  readonly #importLeaflet = inject(LEAFLET_IMPORTER);

  @ViewChild('mapContainer') private readonly mapContainer?: ElementRef<HTMLElement>;

  readonly providers = input<ProxiMapProvider[]>([]);
  readonly userLocation = input<ProxiMapLocation | null>(null);
  readonly viewProfile = output<ProxiMapProvider['id']>();

  private leaflet?: LeafletModule;
  private map?: LeafletMap;
  private markerLayer?: LayerGroup;
  private userMarker?: Marker;
  private viewInitialized = false;
  private destroyed = false;
  private initPromise?: Promise<void>;
  private lastInputSignature = '';
  private popupCleanups: Array<() => void> = [];

  protected readonly isBrowser = isPlatformBrowser(this.#platformId);
  protected readonly mapReady = signal(false);
  protected readonly mapFailed = signal(false);
  protected readonly hasUserLocation = computed(() => this.isValidLocation(this.userLocation()));
  protected readonly fallbackMessage = computed(() => {
    if (!this.isBrowser) {
      return 'Mapa indisponível durante a renderização inicial.';
    }

    if (!this.hasUserLocation()) {
      return 'Informe sua localização para visualizar profissionais próximos no mapa.';
    }

    if (this.mapFailed()) {
      return 'Não foi possível carregar o mapa. Tente novamente em instantes.';
    }

    if (!this.mapReady()) {
      return 'Preparando mapa de profissionais próximos.';
    }

    return '';
  });

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    void this.syncMap();
  }

  ngDoCheck(): void {
    if (!this.viewInitialized) {
      return;
    }

    const nextSignature = this.getInputSignature();
    if (nextSignature === this.lastInputSignature) {
      return;
    }

    this.lastInputSignature = nextSignature;
    void this.syncMap();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearPopupCleanups();
    this.markerLayer?.clearLayers();
    this.map?.remove();
    this.markerLayer = undefined;
    this.userMarker = undefined;
    this.map = undefined;
    this.mapReady.set(false);
  }

  protected emitViewProfile(providerId: ProxiMapProvider['id']): void {
    this.viewProfile.emit(providerId);
  }

  private async syncMap(): Promise<void> {
    if (!this.isBrowser || !this.mapContainer || !this.hasUserLocation()) {
      this.mapReady.set(false);
      return;
    }

    if (!this.map) {
      await this.initializeMap();
    }

    if (!this.map || !this.leaflet || this.destroyed) {
      return;
    }

    this.refreshMarkers();
    this.fitBoundsToMarkers();
    window.setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private async initializeMap(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.createMap();
    return this.initPromise;
  }

  private async createMap(): Promise<void> {
    try {
      const location = this.userLocation();
      if (!this.mapContainer || !this.isValidLocation(location)) {
        return;
      }

      this.leaflet = await this.#importLeaflet();
      if (this.destroyed) {
        return;
      }

      this.map = this.leaflet.map(this.mapContainer.nativeElement, {
        zoomControl: true,
        attributionControl: true,
      }).setView(this.toLatLng(location), 13);

      this.leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(this.map);

      this.markerLayer = this.leaflet.layerGroup().addTo(this.map);
      this.mapReady.set(true);
      this.mapFailed.set(false);
    } catch {
      this.mapFailed.set(true);
      this.mapReady.set(false);
    }
  }

  private refreshMarkers(): void {
    if (!this.leaflet || !this.markerLayer) {
      return;
    }

    this.clearPopupCleanups();
    this.markerLayer.clearLayers();
    this.userMarker = undefined;

    const location = this.userLocation();
    if (this.isValidLocation(location)) {
      this.userMarker = this.leaflet
        .marker(this.toLatLng(location), {
          icon: this.createUserIcon(),
          title: 'Sua localização',
        })
        .bindPopup('<strong>Sua localização</strong>')
        .addTo(this.markerLayer);
    }

    this.validProviders().forEach((provider) => {
      const popup = this.createProviderPopup(provider);
      this.leaflet!
        .marker(this.toLatLng(provider), {
          icon: this.createProviderIcon(provider),
          title: provider.name,
        })
        .bindPopup(popup)
        .addTo(this.markerLayer!);
    });
  }

  private fitBoundsToMarkers(): void {
    if (!this.leaflet || !this.map) {
      return;
    }

    const points: LatLngExpression[] = [];
    const location = this.userLocation();
    if (this.isValidLocation(location)) {
      points.push(this.toLatLng(location));
    }

    this.validProviders().forEach((provider) => points.push(this.toLatLng(provider)));

    if (points.length > 1) {
      this.map.fitBounds(this.leaflet.latLngBounds(points), {
        padding: [32, 32],
        maxZoom: 15,
      });
      return;
    }

    if (points.length === 1) {
      this.map.setView(points[0], 13);
    }
  }

  private createUserIcon(): DivIcon {
    return this.leaflet!.divIcon({
      className: 'proxi-map-marker proxi-map-marker--user',
      html: '<span class="proxi-map-marker__dot" aria-hidden="true"></span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14],
    });
  }

  private createProviderIcon(provider: ProxiMapProvider): DivIcon {
    const flags = [
      provider.premium ? 'proxi-map-marker--premium' : '',
      provider.verified ? 'proxi-map-marker--verified' : '',
    ].filter(Boolean);

    return this.leaflet!.divIcon({
      className: ['proxi-map-marker', 'proxi-map-marker--provider', ...flags].join(' '),
      html: '<span class="proxi-map-marker__pin" aria-hidden="true"></span>',
      iconSize: [34, 42],
      iconAnchor: [17, 42],
      popupAnchor: [0, -36],
    });
  }

  private createProviderPopup(provider: ProxiMapProvider): HTMLElement {
    const popup = document.createElement('article');
    popup.className = 'proxi-map-popup';

    const title = document.createElement('h3');
    title.className = 'proxi-map-popup__title';
    title.textContent = provider.name;

    const service = document.createElement('p');
    service.className = 'proxi-map-popup__service';
    service.textContent = provider.service;

    const meta = document.createElement('dl');
    meta.className = 'proxi-map-popup__meta';
    this.appendMeta(meta, 'Avaliação', this.formatRating(provider.rating));
    this.appendMeta(meta, 'Distância', this.formatDistance(provider.distanceKm));
    this.appendMeta(meta, 'A partir de', this.formatPrice(provider.priceFrom));

    const badges = document.createElement('div');
    badges.className = 'proxi-map-popup__badges';
    if (provider.premium) {
      badges.appendChild(this.createBadge('Premium'));
    }
    if (provider.verified) {
      badges.appendChild(this.createBadge('Verificado'));
    }

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'proxi-map-popup__action';
    action.textContent = 'Ver perfil';
    action.setAttribute('aria-label', `Ver perfil de ${provider.name}`);
    const onClick = () => this.emitViewProfile(provider.id);
    action.addEventListener('click', onClick);
    this.popupCleanups.push(() => action.removeEventListener('click', onClick));

    popup.append(title, service, meta);
    if (badges.childElementCount) {
      popup.appendChild(badges);
    }
    popup.appendChild(action);

    return popup;
  }

  private appendMeta(list: HTMLDListElement, label: string, value: string): void {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    list.append(term, description);
  }

  private createBadge(text: string): HTMLSpanElement {
    const badge = document.createElement('span');
    badge.className = 'proxi-map-popup__badge';
    badge.textContent = text;
    return badge;
  }

  private clearPopupCleanups(): void {
    this.popupCleanups.forEach((cleanup) => cleanup());
    this.popupCleanups = [];
  }

  private validProviders(): ProxiMapProvider[] {
    return this.providers().filter((provider) => this.isValidLocation(provider));
  }

  private toLatLng(location: ProxiMapLocation): LatLngExpression {
    return [location.lat, location.lng];
  }

  private getInputSignature(): string {
    const location = this.userLocation();
    const providers = this.providers()
      .map((provider) => [
        provider.id,
        provider.lat,
        provider.lng,
        provider.name,
        provider.service,
        provider.rating,
        provider.priceFrom,
        provider.distanceKm,
        provider.premium,
        provider.verified,
      ].join(':'))
      .join('|');

    return `${location?.lat ?? ''}:${location?.lng ?? ''}:${providers}`;
  }

  private formatRating(rating: number): string {
    return Number.isFinite(rating) ? `${rating.toFixed(1)} ★` : 'Sem avaliação';
  }

  private formatDistance(distanceKm?: number): string {
    return Number.isFinite(distanceKm) ? `${distanceKm!.toFixed(1)} km` : 'Distância indisponível';
  }

  private formatPrice(priceFrom: number): string {
    return Number.isFinite(priceFrom)
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceFrom)
      : 'Preço sob consulta';
  }

  private isValidLocation(location: ProxiMapLocation | null): location is ProxiMapLocation {
    return (
      !!location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng) &&
      Math.abs(location.lat) <= 90 &&
      Math.abs(location.lng) <= 180
    );
  }
}
