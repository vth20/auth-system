import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { UserAuthMethod } from "../../constants/enums";
import db from "../../database";
import userRepository from "../../repositories/users";
import tokenService from "../../services/tokens";
import authService from "../../services/auth";
import {
  IUserAuthMethod,
  IUserAuthToken,
  IUserLoginWithEmailAndPassword,
  IUserRegister,
} from "../../types";
import apiResponse from "../../utils/api/response";
import { hashPassword } from "../../utils/auth";
import catchAsync from "../../utils/errors/catchAsync";
import { publishMessageVerifyEmail } from "../../queues/producers";
import UserService from "../../services/users";
class AuthController {
  static register = catchAsync(async (req: Request, res: Response) => {
    const trx = await db.getConnection().transaction();
    try {
      const payload = req.body as IUserRegister;
      // check email is active
      const isExistAndPending = await UserService.isExistByEmailAndPending(
        payload.email
      );
      if (isExistAndPending) {
        // handle resend new email verify
        const user = (await UserService.findUserByEmail(
          payload.email
        )) as IUserAuthToken;
        // Create verify email token
        const verificationToken = await tokenService.generateVerificationToken(
          user.id,
          trx
        );

        // Handle send message verify email
        await publishMessageVerifyEmail({
          email: payload.email,
          username: payload.userName,
          verificationToken: verificationToken,
        });
        trx.commit();
        return apiResponse.success(
          res,
          "Your email has already been registered but not verified. Please check your inbox to complete the verification process.",
          {},
          httpStatus.CREATED
        );
      }

      // Create user
      const user = (await UserService.createUser(
        payload,
        trx
      )) as IUserAuthToken;

      // Create auth method
      const hashedPassword = await hashPassword(payload.password);
      const userAuthMethod = {
        user_id: user.id,
        auth_method: UserAuthMethod.EMAIL_PASSWORD,
        identifier: payload.email,
        auth_data: hashedPassword,
      } as IUserAuthMethod;
      await authService.create(userAuthMethod, trx);

      // Create auth token
      const tokens = await tokenService.generateAuthTokens(user, trx);

      // Create verify email token
      const verificationToken = await tokenService.generateVerificationToken(
        user.id,
        trx
      );

      // Handle send message verify email
      await publishMessageVerifyEmail({
        email: payload.email,
        username: payload.userName,
        verificationToken: verificationToken,
      });

      trx.commit();
      return apiResponse.success(
        res,
        "Register success",
        { user, tokens },
        httpStatus.CREATED
      );
    } catch (error) {
      trx.rollback();
      throw error;
    }
  });

  static loginWithEmailAndPassword = catchAsync(
    async (req: Request, res: Response) => {
      const payload = req.body as IUserLoginWithEmailAndPassword;
      const user = await authService.loginWithEmailAndPassword(payload);
      const tokens = await tokenService.generateAuthTokens(user);

      return apiResponse.success(
        res,
        "Login success",
        { user, tokens },
        httpStatus.OK
      );
    }
  );

  /**
   * Handles the email verification process.
   * The method extracts the verification token from the request query, verifies it using the `authService`, and returns a success response if the verification is successful.
   *
   * @async
   * @function verifyEmail
   * @param {Request} req - The Express request object containing the verification token in the query parameters.
   * @param {Response} res - The Express response object used to send the API response.
   * @returns {Promise<Response>} A success response with a message confirming email verification.
   */
  static verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const token = req.query.token as string;
    await authService.verifyEmail(token);
    return apiResponse.success(res, "Verify email success", {}, httpStatus.OK);
  });
}

export default AuthController;
