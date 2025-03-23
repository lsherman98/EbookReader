import { useEffect, useState } from "react";
import { Chat } from "./ui/chat";
import { Message } from "./ui/chat-message";
import { useGetMessagesByChatId } from "@/lib/api/queries";
import { useAddMessage, useGenerateAIResponse } from "@/lib/api/mutations";

export function NestedSideBarContent({ selectedChatId }: { selectedChatId: string | undefined }) {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: messagesData, isPending: isMessagesPending } = useGetMessagesByChatId(selectedChatId);

  const addMessageMutation = useAddMessage();
  const generateAiResponseMutation = useGenerateAIResponse();

  useEffect(() => {
    if (!isMessagesPending && messagesData) {
      setMessages(messagesData as Message[]);
    }
  }, [messagesData, isMessagesPending]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();

    if (!input || !selectedChatId) {
      return;
    }

    let data = await addMessageMutation.mutateAsync({
      chat: selectedChatId,
      content: input,
      role: "user",
    });

    let message: Message = {
      content: data.content,
      role: data.role,
      id: data.id,
      createdAt: new Date(data.created),
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);

    // handle error - set failed = true on message
    data = await generateAiResponseMutation.mutateAsync(updatedMessages);
    data = await addMessageMutation.mutateAsync({
      chat: selectedChatId,
      content: data.content,
      role: data.role,
    });

    message = {
      content: data.content,
      role: data.role,
      id: data.id,
      createdAt: new Date(data.created),
    };

    setMessages((prev) => [...prev, message]);
    setInput("");
  };

  // Show loading state or content based on data availability
  return (
    <div className="h-full grid grid-cols gap-x-2 px-4 py-4">
      <>
        <Chat
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isGenerating={generateAiResponseMutation.isPending}
          setMessages={setMessages}
        />
      </>
    </div>
  );
}
