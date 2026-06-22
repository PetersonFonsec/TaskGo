import { faArrowRightFromBracket, faBell, faBuildingColumns, faChartSimple, faCreditCard, faCrown, faGear, faLocationDot, faLock, faQuestionCircle, faUser, faWallet } from '@fortawesome/free-solid-svg-icons';

export interface AsideListItem {
    text: string;
    routerLink: string;
    icon: any;
    function?: (fn: Function) => void;
}

export const asideListItemsSecundary: AsideListItem[] = [
    {
        text: 'Dados Profissionais',
        routerLink: '/customer/professional-info',
        icon: faUser
    },
    {
        text: 'Conta Bancária',
        routerLink: '/customer/bank-account',
        icon: faBuildingColumns
    },
    {
        text: 'Ganhos',
        routerLink: '/customer/earnings',
        icon: faChartSimple
    },
    {
        text: 'Plano Premium',
        routerLink: '/customer/premium-plan',
        icon: faCrown
    },
]

export const asideListItems: AsideListItem[] = [
    {
        text: 'Dados Pessoais',
        routerLink: '/general/1/profile',
        icon: faUser
    },
    {
        text: 'Endereços',
        routerLink: '/general/1/addresses',
        icon: faLocationDot
    },
    {
        text: 'Cartões',
        routerLink: '/customer/cards',
        icon: faCreditCard
    },
    {
        text: 'Pagamentos',
        routerLink: '/customer/payments',
        icon: faWallet
    },
    {
        text: 'Segurança',
        routerLink: '/customer/security',
        icon: faLock
    },
    {
        text: 'Notificações',
        routerLink: '/customer/notifications',
        icon: faBell
    },
    {
        text: 'Preferências',
        routerLink: '/customer/preferences',
        icon: faGear
    }
]

export const asideListItemsFooter = [
    {
        text: 'Ajuda e Suporte',
        routerLink: '/customer/support',
        icon: faQuestionCircle
    }, 
    // {
    //     text: 'Sair da Conta',
    //     routerLink: '/customer/logout',
    //     icon: faArrowRightFromBracket,
    //     function: (fn: Function) => fn()
    // }
]