import type { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "./button";
export type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;
