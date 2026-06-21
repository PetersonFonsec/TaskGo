import { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { faBriefcase, faHome, faLocationDot } from "@fortawesome/free-solid-svg-icons"

export interface address_icon {
    address_type: string,
    icon: IconDefinition
}

export const ADDRESS_ICONS: address_icon[] = [
    {
        address_type: 'home',
        icon: faHome
    },
    {
        address_type: 'work',
        icon: faBriefcase
    },
    {
        address_type: 'other',
        icon: faLocationDot
    },
]

export enum CardAddressActions {
    edit,
    remove
}

export interface CardAddressEvent {
    action: CardAddressActions;
    address_id: string;
}