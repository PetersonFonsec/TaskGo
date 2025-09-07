import { TestingModule, Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";

import { AuthController } from "./auth.controller";
import { UserService } from "../user/user.service";
import Mediator from "@shared/events/mediator";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";

describe("Auth Controller", () => {
  let authControler: AuthController;
  let authService: AuthService;
  let userServiceMock;
  let jwtServiceMock;

  beforeEach(async () => {
    const USER = () => ({});

    userServiceMock = {
      updatePassword: jest.fn(() => USER()),
      deleteUser: jest.fn(() => USER()),
      updateUser: jest.fn(() => USER()),
      getAllUser: jest.fn(() => Array(3).fill(USER())),
      createUser: jest.fn().mockImplementation((user) => Promise.resolve(user)),
      find: jest.fn(() => USER()),
    }

    jwtServiceMock = {
      sign: jest.fn(() => "TOKEN"),
      verify: jest.fn(),
      decode: jest.fn()
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        Mediator,
        AuthService,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ]
    }).overrideGuard(AuthGuard).useValue({
      canActive: jest.fn(() => true)
    }).compile();

    authControler = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it("Smoke test", () => {
    expect(authControler).toBeDefined()
    expect(authService).toBeDefined()
  });
});
