import { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { faPix } from "@fortawesome/free-brands-svg-icons";
import { faCheck, faClock, faCreditCard, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";

export interface ProviderLegend {
    icon: IconDefinition,
    label: string

}

export const PROVIDER_CONTENT: ProviderLegend[] = [
    {
        icon: faMapMarkerAlt,
        label: '3,1 km de você'
    },
    {
        icon: faPix,
        label: 'Aceita pix'
    },
    {
        icon: faClock,
        label: 'Disponivel 24 horas'
    },
    {
        icon: faCreditCard,
        label: 'Aceita Cartão'
    }
]