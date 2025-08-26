import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { JwtService } from "@nestjs/jwt";

import { UserService } from "../user/user.service";
import Mediator from "../shared/events/mediator";
import { USER } from "../user/user.mock";

describe("Auth Controller", () => {
  let authService: AuthService;
  let mediator: Mediator;
  let jwtServiceMock;
  let userMock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    userMock = {
      findMany: jest.fn().mockResolvedValue([USER()]),
      findUnique: jest.fn().mockResolvedValue(USER()),
      update: jest.fn().mockResolvedValue(USER()),
      create: jest.fn().mockReturnValue(USER()),
      find: jest.fn().mockResolvedValue(USER()),
      delete: jest.fn(), // O método delete não retorna nada
    };

    jwtServiceMock = {
      sign: jest.fn(() => "TOKEN"),
      verify: jest.fn(),
      decode: jest.fn()
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        Mediator,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: UserService, useValue: userMock },
      ],
    }).compile();

    authService = module.get(AuthService);
    mediator = module.get(Mediator);
  });

  describe("#forgetPassword ", () => {
    it("Should trigger the event to mediator", async () => {
      const spyOn = jest.spyOn(mediator, 'publish');
      await authService.forgetPassword(USER());
      expect(spyOn).toHaveBeenCalled();
    });
  });
});
