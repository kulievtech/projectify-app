import { prisma } from "../utils/prismaClient.js";

class ProjectService {
    create = async (input, userId) => {
        const project = await prisma.project.create({
            data: {
                ...input,
                userId: userId
            }
        });

        return project;
    };

    getOne = async (id, userId) => {
        const project = await prisma.project.findUnique({
            where: {
                id: id
            }
        });

        if (!project) {
            throw new CustomError("Project does not exist", 404);
        }

        if (project.userId !== userId) {
            throw new CustomError(
                "Forbidden: This project does not belong to you!",
                403
            );
        }

        return project;
    };
}

export const projectService = new ProjectService();