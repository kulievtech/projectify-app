import { prisma } from "../prisma/index.js";
import { crypto } from "../utils/crypto.js";
import { mailer } from "../utils/mailer.js";
import { bcrypt } from "../utils/bcrypt.js";
import { date } from "../utils/date.js";

class UserService {
    signUp = async (input) => {
        try {
            const hashedPassword = await bcrypt.hash(input.password);
            const activationToken = crypto.createToken();
            const hashedActivationToken = crypto.hash(activationToken);
            await prisma.user.create({
                data: {
                    ...input,
                    password: hashedPassword,
                    activationToken: hashedActivationToken
                }
            });
            await mailer.sendActivationMail(input.email, activationToken);
        } catch (error) {
            throw new Error(error);
        }
    };

    login = async (input) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    email: input.email
                },
                select: {
                    id: true,
                    status: true,
                    password: true
                }
            });

            if (!user) throw new Error("Invalid Credentials");

            if (user.status === "INACTIVE") {
                const activationToken = crypto.createToken();
                const hashedActivationToken = crypto.hash(activationToken);

                await prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        activationToken: hashedActivationToken
                    }
                });

                await mailer.sendActivationMail(input.email, activationToken);

                throw new Error(
                    "We just sent you activation email. Follow instructions"
                );
            }

            const isPasswordMatches = await bcrypt.compare(
                input.password,
                user.password
            );
            if (!isPasswordMatches) {
                throw new Error("Invalid Credentials");
            }

            const sessionId = crypto.createToken();
            const hashedSessionId = crypto.hash(sessionId);
            await prisma.session.create({
                data: {
                    sessionId: hashedSessionId,
                    userId: user.id
                }
            });

            return sessionId;
        } catch (error) {
            throw error;
        }
    };

    activate = async (token) => {
        try {
            const hashedActivationToken = crypto.hash(token);
            const user = await prisma.user.findFirst({
                where: {
                    activationToken: hashedActivationToken
                },
                select: {
                    id: true,
                    activationToken: true
                }
            });

            if (!user) {
                throw new Error("Invalid Token");
            }

            await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    status: "ACTIVE",
                    activationToken: null
                }
            });
        } catch (error) {
            throw error;
        }
    };

    forgotPassword = async (email) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    email
                },
                select: {
                    id: true
                }
            });

            if (!user) {
                throw new Error(
                    "We could not find a user with the email you provided"
                );
            }

            const passwordResetToken = crypto.createToken();
            const hashedPasswordResetToken = crypto.hash(passwordResetToken);

            await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    passwordResetToken: hashedPasswordResetToken,
                    passwordResetTokenExpirationDate: date.addMinutes(10)
                }
            });

            await mailer.sendPasswordResetToken(email, passwordResetToken);
        } catch (error) {
            throw error;
        }
    };

    resetPassword = async (token, password) => {
        try {
            const hashedPasswordResetToken = crypto.hash(token);
            const user = await prisma.user.findFirst({
                where: {
                    passwordResetToken: hashedPasswordResetToken
                },
                select: {
                    id: true,
                    passwordResetToken: true,
                    passwordResetTokenExpirationDate: true
                }
            });

            if (!user) {
                throw new Error("Invalid Token");
            }

            const currentTime = new Date();
            const tokenExpDate = new Date(
                user.passwordResetTokenExpirationDate
            );

            if (tokenExpDate < currentTime) {
                // Token Expired;
                throw new Error("Reset Token Expired");
            }

            await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    password: await bcrypt.hash(password),
                    passwordResetToken: null,
                    passwordResetTokenExpirationDate: null
                }
            });
        } catch (error) {
            throw error;
        }
    };

    getMe = async (sessionId) => {
        const hashedSessionId = crypto.hash(sessionId);

        try {
            const session = await prisma.session.findFirst({
                where: {
                    sessionId: hashedSessionId
                },

                select: {
                    userId: true
                }
            });

            if (!session) {
                throw new Error("Not Authenticated");
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: session.userId
                },
                select: {
                    firstName: true,
                    lastName: true,
                    preferredFirstName: true,
                    email: true
                }
            });

            if (!user) {
                throw new Error("User not found");
            }

            return user;
        } catch (error) {
            throw error;
        }
    };

    logout = async (sessionId) => {
        const hashedSessionId = crypto.hash(sessionId);

        try {
            await prisma.session.deleteMany({
                where: {
                    sessionId: hashedSessionId
                }
            });
        } catch (error) {
            throw error;
        }
    };
}

export const userService = new UserService();