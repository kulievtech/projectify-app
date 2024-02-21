import { CustomError } from "../errors/customError.js";
import { prisma } from "../prisma/index.js";
import { teamMemberService } from "./team-member.service.js";

class ProjectService {
    create = async (input, adminId) => {
        const project = await prisma.project.create({
            data: {
                ...input,
                adminId: adminId
            }
        });

        return project;
    };

    getOne = async (id, adminId) => {
        const project = await prisma.project.findUnique({
            where: {
                id: id
            }
        });

        if (!project) {
            throw new CustomError("Project does not exist", 404);
        }

        if (project.adminId !== adminId) {
            throw new CustomError(
                "Forbidden: You are not authorized to perform this action",
                403
            );
        }

        return project;
    };

    update = async (id, adminId, update) => {
        const project = await prisma.project.findUnique({
            where: {
                id: id
            }
        });

        if (!project) {
            throw new CustomError("Project does not exist", 404);
        }

        if (project.adminId !== adminId) {
            throw new CustomError(
                "Forbidden: You are not authorized to perform this action",
                403
            );
        }

        await prisma.project.update({
            where: {
                id: id
            },
            data: {
                ...update
            }
        });
    };

    getAll = async (adminId) => {
        const projects = await prisma.project.findMany({
            where: {
                adminId: adminId
            }
        });

        return projects;
    };

    changeStatus = async (id, adminId, status) => {
        const project = await prisma.project.findUnique({
            where: {
                id: id
            }
        });

        if (!project) {
            throw new CustomError("Project does not exist", 404);
        }

        if (project.adminId !== adminId) {
            throw new CustomError(
                "Forbidden: You are not authorized to perform this action",
                403
            );
        }

        if (project.status === status)
            throw new CustomError(
                `The project already has ${status} status!`,
                400
            );

        await prisma.project.update({
            where: {
                id: id,
                adminId: adminId
            },

            data: {
                status: status
            }
        });
    };

    delete = async (adminId, projectId) => {
        const project = await prisma.project.findUnique({
            where: {
                id: projectId
            }
        });

        if (!project) {
            throw new CustomError(
                `Project does not exist with following id ${projectId}`,
                404
            );
        }

        if (project.adminId !== adminId) {
            throw new CustomError(
                "Forbidden: You are not authorized to perform this action",
                403
            );
        }

        if (project.status === "ACTIVE") {
            throw new CustomError(
                "Only projects with ARCHIVED or COMPLETED status can be deleted!",
                404
            );
        }

        await prisma.project.delete({
            where: {
                id: projectId
            }
        });
    };

    addContributor = async (projectId, teamMemberId, adminId) => {
        await this.isProjectBelongsToAdmin(projectId, adminId);
        await teamMemberService.isTeamMemberBelongsToAdmin(
            teamMemberId,
            adminId
        );
        await prisma.teamMemberProject.create({
            data: { projectId, teamMemberId }
        });
    };

    changeContributorStatus = async (
        projectId,
        teamMemberId,
        adminId,
        status
    ) => {
        await this.isProjectBelongsToAdmin(projectId, adminId);
        await teamMemberService.isTeamMemberBelongsToAdmin(
            teamMemberId,
            adminId
        );

        const teamMemberProject = await prisma.teamMemberProject.findFirst({
            where: {
                projectId,
                teamMemberId
            }
        });

        if (teamMemberProject.status === status)
            throw new CustomError(
                `This contributor already has ${status} status!`,
                400
            );

        await prisma.teamMemberProject.updateMany({
            where: {
                projectId,
                teamMemberId
            },
            data: {
                status
            }
        });
    };

    isProjectBelongsToAdmin = async (id, adminId) => {
        const project = await prisma.project.findUnique({
            where: {
                id
            }
        });

        if (!project) {
            throw new CustomError("Project does not exist", 404);
        }
        if (project.adminId !== adminId) {
            throw new CustomError(
                "Forbidden: You are not authorized to perform this action",
                404
            );
        }
    };
}

export const projectService = new ProjectService();
