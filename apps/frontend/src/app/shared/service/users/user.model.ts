export interface UserResponse {
  "id": string,
  "name": string,
  "email": string,
  "phone": string,
  "type": string,
  "photoUrl": string,
  "createdAt": {},
  "updatedAt": {},
  "cpf": string,
  "addresses": [],
  "orders": [],
  "reviews": [],
  "provider": {
    "id": string,
    "bio": string,
    "ratingAvg": {
      "s": number,
      "e": number,
      "d": any[]
    },
    "ratingCount": any,
    "verified": boolean,
    "createdAt": {},
    "updatedAt": {},
    "pagarmeRecipientId": null
  }
}
