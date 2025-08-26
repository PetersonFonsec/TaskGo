import { Email } from "./email.entity";
import { Phone } from "./phone.entity";

export interface User {
    id: string;
    name: string;
    email: Email;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    photoUrl?: string;
    phone?: Phone;
}