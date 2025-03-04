import { Server, Socket } from "socket.io";
import { ILoginQRCode } from "../../types";
import TokenService from "../../services/tokens";

export const loginQRChannelHandler = (io: Server, socket: Socket) => {
  console.log(`Client connected to login QR code: ${socket.id}`);
  // Target login device (A)
  // Logged device (B)
  // 1: Show QR code in A
  // 2: B scan QR code and emit LOGIN_QR_CODE
  // 3: Server emit CONFIRM_LOGIN_QR_CODE to device B
  // 4: B Confirm and emit CONFIRMED_LOGIN_IN_ANOTHER_DEVICE
  // 5: Server generate new tokens and send to A

  // Listen scan QR code
  socket.on("LOGIN_QR_CODE", async (data: ILoginQRCode) => {
    try {
      // Send event confirm login in another device
      console.log(data);

      io.to(data.currentSocketID).emit("CONFIRM_LOGIN_QR_CODE", {
        deviceInformation: data.deviceInformation,
      });
    } catch (error) {
      io.to(data.currentSocketID).emit("ERROR_LOGIN_QR_CODE", {
        message: "Your token is invalid",
      });
    }
  });

  // Listen Confirm login
  socket.on("CONFIRMED_LOGIN_IN_ANOTHER_DEVICE", async (data) => {
    try {
      const tokenDoc = TokenService.verifyAccessToken(data.accessToken);
      const tokens = await TokenService.generateAuthTokens({
        id: tokenDoc?.sub,
      });
      // Generate and send tokens to new device
      io.to(data.targetSocketID).emit("LOGIN_QR_CODE_SUCCESS", {
        tokens,
      });
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("CANCELED_LOGIN_IN_ANOTHER_DEVICE", async (data) => {
    io.to(data.targetSocketID).emit("LOGIN_QR_CODE_FAILURE");
  });

  // Handle "disconnect" event
  socket.on("disconnect", () => {
    console.log(`Client disconnected from chat: ${socket.id}`);
  });
};
