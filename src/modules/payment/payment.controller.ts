import { ObjectId } from 'bson';
import type { Request } from 'express';
import httpStatus from 'http-status';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { STRIPE_SECRET_KEY } from '../../config/config';
import AppError from '../../errors/AppError';
import { prisma } from '../../libs/prismaHelper';
import { OrderStatus, ProjectStatus } from '../Order_page/Order_page.constant';
import projectNumberCreator from '../Order_page/projectNumberGenarator.ts/projectNumberCreator';
import { PaymentStatus } from './payment.constant';
import catchAsync from '../../libs/utlitys/catchSynch'
import sendResponse from '../../libs/sendResponse';
const stripe = new Stripe(STRIPE_SECRET_KEY as string);

// Utility function to calculate delivery date


const orderId = new ObjectId();

const stripePayment = catchAsync(async (req: Request, res: any) => {
  const projectNumber = await projectNumberCreator();

  const { data, tags } = req.body;
  console.log('data showing:', data);
  console.log('tags showing:', tags);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: data?.items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item?.name,
          images: item?.image, // Optional
        },
        unit_amount: item.isFastDelivery
          ? (item.baseAmount + item.fastDeliveryPrice) * 100
          : item.baseAmount * 100,
      },
      quantity: item?.quantity,
    })),
    mode: 'payment',
    success_url: `http://localhost:5173/project-requirements/${projectNumber}`,
    cancel_url: 'http://localhost:5173/payment-failed',
  });

  // Save payment info in the database
  const payment = await prisma.payment.create({
    data: {
      userId: data?.userId,
      stripeId: session.id.split('_').join(''),
      status: PaymentStatus.PENDING,
      amount: data?.totalAmount.toString(),
      currency: session.currency as string,
      orderId: new ObjectId().toString(),
    },
  });
  
  
  // const payment = await prisma.payment.create({
  //   data: {
  //     userId: data?.userId,
  //     stripeId: session.id.split('_').join(''),
  //     status: PaymentStatus.PENDING,
  //     amount: data?.totalAmount.toString(),
  //     currency: session.currency as string,
  //     orderId: new ObjectId().toString(),
  //   },
  // });\
  console.log(
    "Payment successfully recorded in the database. but it's still pending now",
  );

  // Create an order linked to the payment and user
  if (!payment) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Payment not sucessfull');
  }

  // Generate a session token
  const orderToken = uuidv4();
  const order = await prisma.order.create({
    data: {
      id: payment.orderId,
      stripeId: session.id.split('_').join(''),
      userId: data?.userId,
      projectName: data?.title,
      projectNumber: projectNumber || '',
      items: data?.originalItems,
      projectType: data?.projectType || '',
      projectImage: data?.projectImage || '',
      duration: data?.deliveryDuration.toString(),
      totalPrice: data?.totalAmount.toString(),
      paymentStatus: PaymentStatus.PENDING,
      totalQuantity: data?.totalQuantity.toString(),
      trackProjectStatus: OrderStatus.PROJECT_PLACED,
      projectStatus: ProjectStatus.WAITING,
      requirements: data?.requirements,
      bulletPoints: data?.bulletPoints,
      OrderToken: orderToken,
      orderFrom: data?.orderFrom,
    },
  });

  // Only create tags that don't already exist
  const existingTags = await prisma.tags.findMany({
    where: {
      name: {
        in: tags?.map((tag: string) => tag.trim())
      }
    }
  });

  const existingTagNames = new Set(existingTags.map(tag => tag.name));

  const newTags = tags?.filter((tag: string) => !existingTagNames.has(tag.trim()));

  if (newTags?.length) {
    await prisma.tags.createMany({
      data: newTags.map((tag: string) => ({
        name: tag.trim(),
        orderId: order.id,
      }))
    });
  }

  if (!order) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Payment not sucessfull');
  }
  console.log("Order successfully created with status 'PENDING'.");
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order successfully created with status 'PENDING'",
    data: { id: session.id, orderToken: orderToken },
  });
});

export const payment = { stripePayment };
