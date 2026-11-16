import { FooterLinksParam } from "../footer-links/footer-links";

import { faFacebookF, faInstagram, faXTwitter, faYoutube } from '@fortawesome/free-brands-svg-icons';

export const SOCIAL_LINKS: FooterLinksParam[] = [
  { link: "https://facebook.com", text: "Facebook", icon: faFacebookF, type: "icon" },
  { link: "https://x.com", text: "X", icon: faXTwitter, type: "icon" },
  { link: "https://youtube.com", text: "Youtube", icon: faYoutube, type: "icon" },
  { link: "https://isntagram.com", text: "Instagram", icon: faInstagram, type: "icon" },
]
