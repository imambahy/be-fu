import { User } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { sign } from "jsonwebtoken";
import { MailService } from "../mail/mail.service";
import { hash } from "bcrypt";

export class AuthService {
  private prisma: PrismaService;
  private mailService: MailService;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
  }

  forgotPassword = async (body: Pick<User, "email">) => {
    console.log("Searching for user with email:", body.email);
    
    // Debug: List all users
    const allUsers = await this.prisma.user.findMany();
    console.log("All users in database:", allUsers);
    
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    console.log("User found:", user);

    if (!user) throw new ApiError("user not found", 404);

    const payload = { id: user.id };
    const token = sign(payload, process.env.JWT_SECRET!, { expiresIn: "15m" });

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    await this.mailService.sendMail(
      body.email, //to
      "Reset your password", //subject
      "reset-password", //templateName
      { resetLink } //context: reset link
    );

    return { message: "email sent successfully" };
  };

  resetPassword = async (body: Pick<User, "password">, authUserId: number) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });

    if (!user) throw new ApiError("Account not found", 404);

    const hashedPassword = await hash(body.password, 10)

    await this.prisma.user.update({
      where: { id: authUserId },
      data: { password: hashedPassword },
    })

    return { message: "password reset successfully" }
  };
}
