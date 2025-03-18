import {
    AssistantRuntimeProvider,
    ChatModelAdapter,
    useLocalRuntime,
} from "@assistant-ui/react";
import { Thread } from "./assistant-ui/thread";
import { ThreadList } from "./assistant-ui/thread-list";
import { ReactNode } from "react";
import { pb } from "@/lib/pocketbase";

export function NestedSideBarContent() {
    return (
        <div className="grid h-dvh grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
            <ThreadList />
            <Thread />
        </div>
    );
}

const MyModelAdapter: ChatModelAdapter = {
    async run({ messages, abortSignal }) {
        const data = await pb.send("/chat", {
            method: "POST",
            body: {
                messages,
            },
            abortSignal,
        });

        return {
            content: [
                {
                    type: "text",
                    text: data.text,
                },
            ],
        }
    },
};

export function MyRuntimeProvider({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    const runtime = useLocalRuntime(MyModelAdapter);

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}
