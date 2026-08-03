import { AddFavoriteHandler } from './add-favorite/add-favorite.handler';
import { RemoveFavoriteHandler } from './remove-favorite/remove-favorite.handler';

export const FavoriteCommandHandlers = [
  AddFavoriteHandler,
  RemoveFavoriteHandler,
];

export { AddFavoriteCommand } from './add-favorite/add-favorite.command';
export { RemoveFavoriteCommand } from './remove-favorite/remove-favorite.command';
