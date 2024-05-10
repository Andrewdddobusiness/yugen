// newTripStepper.tsx
"use client";
import { JSX, SVGProps } from "react";
import { motion } from "framer-motion";
import { FaPlane } from "react-icons/fa6";
import { MdFastfood } from "react-icons/md";
import { MdOutlineDirectionsRun } from "react-icons/md";
import { IoReceipt } from "react-icons/io5";

interface StepProps {
  step: number;
  currentStep: number;
}

export default function NewTripStepper({ step }: { step: number }) {
  return (
    <div className="flex items-start">
      <div className="mx-auto w-full max-w-md rounded-xl bg-white relative">
        <div className="flex justify-between rounded p-8 relative z-10">
          <Step step={1} currentStep={step} />
          <Step step={2} currentStep={step} />
          <Step step={3} currentStep={step} />
          <Step step={4} currentStep={step} />
        </div>
        {/* Horizontal line */}
        <hr className="h-1 w-[350px] bg-black absolute top-11 left-12 z-0" />
      </div>
    </div>
  );
}

function Step({ step, currentStep }: StepProps) {
  let status =
    currentStep === step
      ? "active"
      : currentStep < step
      ? "inactive"
      : "complete";

  return (
    <motion.div animate={status} className="relative">
      <motion.div
        variants={{
          active: {
            scale: 1,
            transition: {
              delay: 0,
              duration: 0.2,
            },
          },
          complete: {
            scale: 1.25,
          },
        }}
        transition={{
          duration: 0.6,
          delay: 0.2,
          type: "tween",
          ease: "circOut",
        }}
        className="absolute inset-0 rounded-full bg-black"
      ></motion.div>

      <motion.div
        initial={false}
        variants={{
          inactive: {
            backgroundColor: "var(--white)",
            borderColor: "var(--slate-200)",
            color: "var(--slate-400)",
          },
          active: {
            backgroundColor: "var(--white)",
            borderColor: "var(--blue-500)",
            color: "var(--blue-500)",
          },
          complete: {
            backgroundColor: "var(--black-500)",
            borderColor: "var(--blue-500)",
            color: "var(--blue-500)",
          },
        }}
        transition={{ duration: 0.2 }}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm`}
      >
        <div className="flex items-center justify-center">
          {status === "complete" ? (
            <CheckIcon className="h-4 w-4 text-white" />
          ) : (
            // <span>{step}</span>
            <>
              {step === 1 ? (
                <FaPlane size={16} className="text-white" />
              ) : step === 2 ? (
                <MdFastfood size={16} className="text-white" />
              ) : step === 3 ? (
                <MdOutlineDirectionsRun size={16} className="text-white" />
              ) : (
                <IoReceipt size={16} className="text-white" />
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function CheckIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          delay: 0.2,
          type: "tween",
          ease: "easeOut",
          duration: 0.3,
        }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
