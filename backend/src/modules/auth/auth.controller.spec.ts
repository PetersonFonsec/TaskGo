import { TestingModule, Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";

import { AuthController } from "./auth.controller";
import { UserService } from "../user/user.service";
import { Roles } from "../shared/enums/role.enum";
import Mediator from "../shared/events/mediator";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { USER } from "../user/user.mock";

describe("Auth Controller", () => {
  let authControler: AuthController;
  let authService: AuthService;
  let userServiceMock;
  let jwtServiceMock;

  beforeEach(async () => {
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

  it(`Should set role ${Roles.DIRECTOR} in payload when call registerDirector`, async () => {
    const result = await authControler.registerDirector(USER());

    expect(result.email).toEqual(USER().email);
    expect(result.access_token).toBeDefined();
    expect(result.role).toEqual(Roles.DIRECTOR);
  });

  it(`Should set role ${Roles.STUDENT} in payload when call registerStudent`, async () => {
    const result = await authControler.registerStudent(USER());

    expect(result.email).toEqual(USER().email);
    expect(result.access_token).toBeDefined();
    expect(result.role).toEqual(Roles.STUDENT);
  });

  it(`Should set role ${Roles.TEACHER} in payload when call registerTeacher`, async () => {
    const result = await authControler.registerTeacher(USER());

    expect(result.email).toEqual(USER().email);
    expect(result.access_token).toBeDefined();
    expect(result.role).toEqual(Roles.TEACHER);
  });
});
