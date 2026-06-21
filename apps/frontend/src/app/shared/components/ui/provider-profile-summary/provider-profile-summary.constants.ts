import { faClock, faCreditCard, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { faPix } from "@fortawesome/free-brands-svg-icons";

export interface ProviderProfileSummaryLegend {
    icon: IconDefinition,
    label: string,
    value: string
}

export const PROVIDER_PROFILE_SUMMARY_CONTENT: ProviderProfileSummaryLegend[] = [
    {
        icon: faMapMarkerAlt,
        label: "3,1 km de você",
        value: "São Bernardo do Campo"
    },
    {
        icon: faClock,
        label: "Mais de cinco anos de expceriência",
        value: "Profissional Expecialista"
    },
    {
        icon: faCreditCard,
        label: "Profissional Premium",
        value: "Alta qualidade e confiabilidade"   
    }
]