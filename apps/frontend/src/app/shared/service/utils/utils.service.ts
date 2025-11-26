import { UrlBase } from "@shared/enums/base-url.enum";
import { Roles, RolesBack } from "@shared/enums/roles.enum";

export class Utils {
  static readonly byteValue = 1048576;

  static convertToFormData(form: any) {
    let form_data = new FormData();

    for (let key in form) form_data.append(key, form[key]);

    return form_data;
  }

  static addMonth(date: Date, month: number) {
    return new Date(date.setMonth(date.getMonth() + month));
  }

  static subtractMonth(date: Date, month: number) {
    return new Date(date.setMonth(date.getMonth() - month));
  }

  static getRouteByRoleBack(role: RolesBack): string {
    const urlBaseByRoles: any = { [RolesBack.PROVIDER]: `/${UrlBase.PROVIDER}`, [RolesBack.CUSTOMER]: `/${UrlBase.CUSTOMER}` };

    return urlBaseByRoles[role] || "/authenticate";
  }

  static getRouteByRole(role: Roles): string {
    const urlBaseByRoles: any = { [Roles.PROVIDER]: `/${UrlBase.PROVIDER}`, [Roles.CUSTOMER]: `/${UrlBase.CUSTOMER}` };

    return urlBaseByRoles[role] || "/authenticate";
  }

  static subtractDays(date: Date, days: number) {
    const newDate = new Date(date);
    return new Date(newDate.setDate(newDate.getDate() - days));
  }

  static addDays(date: Date, days: number) {
    const newDate = new Date(date);
    return new Date(newDate.setDate(newDate.getDate() + days));
  }
}
