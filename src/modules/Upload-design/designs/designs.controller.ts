import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { prisma } from '../../../libs/prismaHelper';
import sendResponse from '../../../libs/sendResponse';
import { z } from 'zod';

const getByNameSchema = z.object({
    name: z.string().nonempty({ message: 'Sub Folder name is required' }),
});

const getByname = async (req: Request, res: Response) => {
    try {
        // Validate the query using Zod
        const { name } = getByNameSchema.parse(req.query);

        const findByName = await prisma.uploadDesign.findMany({
            where: { subFolder: name },
        });



        if (findByName.length === 0) {
            return sendResponse<any>(res, {
                statusCode: httpStatus.NOT_FOUND,
                success: false,
                data: null,
                message: `Folders are not found`,
            });
        }

        return sendResponse<any>(res, {
            statusCode: httpStatus.OK,
            success: true,
            data: findByName,
            message: `Folders retrieved successfully`,
        });

    } catch (error) {
        console.error(error);

        if (error instanceof z.ZodError) {
            return sendResponse<any>(res, {
                statusCode: httpStatus.BAD_REQUEST,
                success: false,
                data: null,
                message: `Validation error: ${error.message}`,
            });
        }

        return sendResponse<any>(res, {
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            success: false,
            data: null,
            message: `Internal server error`,
        });
    }
};

const getAll = async (req: Request, res: Response) => {
    try {
        // Fetch all folders from the database
        const findAll = await prisma.designs.findMany({ select: { name: true } });

        // Send success response with retrieved data
        return sendResponse<any>(res, {
            statusCode: httpStatus.OK,
            success: true,
            data: findAll,
            message: `Designs retrieved successfully`,
        });

    } catch (error) {
        console.error('Error fetching folders:', error);

        // Handle validation errors
        if (error instanceof z.ZodError) {
            return sendResponse<any>(res, {
                statusCode: httpStatus.BAD_REQUEST,
                success: false,
                data: null,
                message: `Validation error: ${error.message}`,
            });
        }

        // Handle other types of errors
        return sendResponse<any>(res, {
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            success: false,
            data: null,
            message: `Internal server error`,
        });
    }
}

export const Designs = {
    getByname, getAll
};