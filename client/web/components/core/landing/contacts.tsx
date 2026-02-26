"use client";

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerTrigger,
    DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RippleButton } from "@/components/ui/ripple-button";

export const Contacts = () => {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p className="text-gray-500 text-center max-w-md">
                Fill in your details and we will get back to you.
            </p>

            <div className="flex flex-wrap gap-4">
                {/* Drawer 1 - Newsletter */}
                <Drawer>
                    <DrawerTrigger asChild>
                        <RippleButton>Subscribe</RippleButton>
                    </DrawerTrigger>
                    <DrawerContent>
                        <div className="flex flex-col items-center text-center py-6 px-4">
                            <DrawerHeader className="space-y-2 max-w-md">
                                <DrawerTitle>Subscribe to Newsletter</DrawerTitle>
                                <DrawerDescription>
                                    Enter your email to receive the latest updates.
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="w-full max-w-md mt-4">
                                <div className="grid gap-2 text-left">
                                    <Label htmlFor="email1">Email</Label>
                                    <Input id="email1" type="email" placeholder="you@example.com" />
                                </div>
                            </div>
                            <DrawerFooter className="w-full max-w-md mt-6">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <RippleButton className="flex-1">
                                        Subscribe
                                    </RippleButton>

                                    <DrawerClose asChild>
                                        <RippleButton className="flex-1">
                                            Cancel
                                        </RippleButton>
                                    </DrawerClose>
                                </div>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>

                {/* Drawer 2 - Feedback */}
                <Drawer>
                    <DrawerTrigger asChild>
                        <RippleButton>Feedback</RippleButton>
                    </DrawerTrigger>
                    <DrawerContent>
                        <div className="flex flex-col items-center text-center py-6 px-4">
                            <DrawerHeader className="space-y-2 max-w-md">
                                <DrawerTitle>Submit Feedback</DrawerTitle>
                                <DrawerDescription>
                                    Let us know your thoughts about our service.
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="w-full max-w-md mt-4 space-y-4">
                                <div className="grid gap-2 text-left">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" type="text" placeholder="Your name" />
                                </div>
                                <div className="grid gap-2 text-left">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Your feedback..."
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>
                            <DrawerFooter className="w-full max-w-md mt-6">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <RippleButton className="flex-1">
                                        Submit
                                    </RippleButton>

                                    <DrawerClose asChild>
                                        <RippleButton className="flex-1">
                                            Cancel
                                        </RippleButton>
                                    </DrawerClose>
                                </div>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>

                {/* Drawer 3 - Contact Form */}
                <Drawer>
                    <DrawerTrigger asChild>
                        <RippleButton>Contact</RippleButton>
                    </DrawerTrigger>
                    <DrawerContent>
                        <div className="flex flex-col items-center text-center py-6 px-4">
                            <DrawerHeader className="space-y-2 max-w-md">
                                <DrawerTitle>Contact Us</DrawerTitle>
                                <DrawerDescription>
                                    Fill in your details and we will get back to you.
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="w-full max-w-md mt-4 space-y-4">
                                <div className="grid gap-2 text-left">
                                    <Label htmlFor="contact-name">Name</Label>
                                    <Input
                                        id="contact-name"
                                        type="text"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div className="grid gap-2 text-left">
                                    <Label htmlFor="contact-email">Email</Label>
                                    <Input
                                        id="contact-email"
                                        type="email"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <div className="grid gap-2 text-left">
                                    <Label htmlFor="contact-message">Message</Label>
                                    <Textarea
                                        id="contact-message"
                                        placeholder="Your message..."
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>
                            <DrawerFooter className="w-full max-w-md mt-6">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <RippleButton className="flex-1">
                                        Send
                                    </RippleButton>

                                    <DrawerClose asChild>
                                        <RippleButton className="flex-1">
                                            Cancel
                                        </RippleButton>
                                    </DrawerClose>
                                </div>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </div>
    );
}

