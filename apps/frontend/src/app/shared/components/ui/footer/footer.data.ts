import { UrlBase } from "@shared/enums/base-url.enum";
import { FooterLinksParam } from "../footer-links/footer-links";

import { faFacebookF, faInstagram, faXTwitter, faYoutube } from '@fortawesome/free-brands-svg-icons';

export const INSTITUTIONAL_LINKS: FooterLinksParam[] = [
  { link: UrlBase.INSTITUTIONAL + "/termos-de-uso", text: "Termos e condições de uso", type: "text" },
  { link: UrlBase.INSTITUTIONAL + "/dicas-de-segurança", text: "Dicas de segurança", type: "text" },
  { link: UrlBase.INSTITUTIONAL + "/código-de-conduta", text: "Código de conduta", type: "text" },
  { link: UrlBase.INSTITUTIONAL + "/privacidade", text: "Privacidade", type: "text" },
]

export const MENUS_LINKS: FooterLinksParam[] = [
  { link: UrlBase.INSTITUTIONAL + "/pagamentos", text: "Pagamentos", type: "text" },
  { link: UrlBase.INSTITUTIONAL + "/endereços", text: "Endereços", type: "text" },
  { link: UrlBase.INSTITUTIONAL + "/serviços", text: "Serviços", type: "text" },
  { link: UrlBase.INSTITUTIONAL + "/perfil", text: "Perfil", type: "text" },
]

export const SOCIAL_LINKS: FooterLinksParam[] = [
  { link: "https://facebook.com", text: "Facebook", icon: faFacebookF, type: "icon" },
  { link: "https://x.com", text: "X", icon: faXTwitter, type: "icon" },
  { link: "https://youtube.com", text: "Youtube", icon: faYoutube, type: "icon" },
  { link: "https://isntagram.com", text: "Instagram", icon: faInstagram, type: "icon" },
]
