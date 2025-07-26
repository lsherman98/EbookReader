import { useEffect, useState } from "react";
import { Chat } from "./ui/chat";
import { Message } from "./ui/chat-message";
import { useGetMessagesByChatId } from "@/lib/api/queries";
import { useAddMessage, useGenerateAIResponse } from "@/lib/api/mutations";
import { handleError } from "@/lib/utils";

export function ChatSideBarContent({ selectedChatId, selectedBookId, selectedChapterId }: { selectedChatId: string | undefined, selectedBookId: string, selectedChapterId: string | undefined }) {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: messagesData, isPending: isMessagesPending } = useGetMessagesByChatId(selectedChatId);

  const addMessageMutation = useAddMessage();
  const generateAiResponseMutation = useGenerateAIResponse();

  useEffect(() => {
    if (!isMessagesPending && messagesData && "expand" in messagesData && messagesData.expand?.messages) {
      setMessages(messagesData.expand?.messages as Message[]);
    } else if (!isMessagesPending && messagesData) {
      setMessages([]);
    }
  }, [messagesData, isMessagesPending]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const createMessageObject = (data: {
    content: string;
    role: "user" | "assistant";
    id: string;
    created: string;
  }): Message => {
    return {
      content: data.content,
      role: data.role,
      id: data.id,
      createdAt: new Date(data.created),
    };
  };

  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    if (!input || !selectedChatId) {
      return;
    }

    setInput("");

    let data = await addMessageMutation.mutateAsync({
      chatId: selectedChatId,
      content: input,
      role: "user",
    });
    if (!data) {
      handleError(new Error("Failed to add message"));
      return;
    }

    let message = createMessageObject(data);
    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);

    data = await generateAiResponseMutation.mutateAsync({
      messages: updatedMessages,
      chatId: selectedChatId,
      bookId: selectedBookId,
      chapterId: selectedChapterId,
    });
    if (!data) {
      handleError(new Error("Failed to generate AI response"));
      return;
    }

    data = await addMessageMutation.mutateAsync({
      chatId: selectedChatId,
      content: data.content,
      role: data.role,
    });
    if (!data) {
      handleError(new Error("Failed to add AI response message"));
      return;
    }

    message = createMessageObject(data);
    setMessages((prev) => [...prev, message]);
  };

  return (
    <div className="h-full grid grid-cols gap-x-2 px-4 py-4">
      <Chat
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isGenerating={generateAiResponseMutation.isPending}
        setMessages={setMessages}
        className="overflow-y-auto"
      />
    </div>
  );
}
