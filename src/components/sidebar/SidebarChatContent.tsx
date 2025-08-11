import { useEffect, useState } from "react";
import { Chat } from "../ui/chat";
import { Message } from "../ui/chat-message";
import { useGetMessagesByChatId } from "@/lib/api/queries";
import { useAddMessage, useGenerateAIResponse } from "@/lib/api/mutations";
import {
  handleError,
  generateTextHash,
  processCitationsForDisplay,
  processMessagesWithCitations,
  buildCitationMap,
  createMessageObj,
} from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useCitationStore } from "@/lib/stores/citation-store";
import { AIChatResponse, Citation } from "@/lib/types";

export function SidebarChatContent({
  selectedBookId,
  selectedChapterId,
  selectedChatId,
}: {
  selectedBookId: string;
  selectedChapterId: string | undefined;
  selectedChatId: string | undefined;
}) {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [citationMap, setCitationMap] = useState<Map<string, Citation>>(new Map());

  const navigate = useNavigate();
  const { setCurrentCitation } = useCitationStore();
  const { data, isPending } = useGetMessagesByChatId(selectedChatId);

  const addMessageMutation = useAddMessage();
  const generateAIResponseMutation = useGenerateAIResponse();

  useEffect(() => {
    if (!isPending && data && "expand" in data && data.expand?.messages) {
      const loadedMessages = data.expand?.messages as Message[];

      const processedMessages = processMessagesWithCitations(loadedMessages);
      const newCitationMap = buildCitationMap(loadedMessages);

      setMessages(processedMessages);
      setCitationMap(newCitationMap);
    } else if (!isPending && data) {
      setMessages([]);
      setCitationMap(new Map());
    }
  }, [data, isPending]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const goToCitation = (textHash: string) => {
    const citation = citationMap.get(textHash);
    if (citation) {
      setCurrentCitation(undefined);
      setTimeout(() => {
        setCurrentCitation(citation);
      }, 0);
      navigate({
        to: "/reader/$bookId",
        params: { bookId: selectedBookId },
        search: { chapter: citation.chapter },
      });
    }
  };

  const processCitations = (answer: string, citations: Citation[]): string => {
    setCitationMap((prevMap) => {
      const newMap = new Map(prevMap);
      citations.forEach((citation) => {
        const textHash = generateTextHash(citation.quote);
        newMap.set(textHash, { ...citation, id: textHash });
      });
      return newMap;
    });
    return answer;
  };

  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    if (!input || !selectedChatId) return;
    setInput("");

    const msgData = await addMessageMutation.mutateAsync({
      chatId: selectedChatId,
      content: input,
      role: "user",
    });

    if (addMessageMutation.isError || !msgData) {
      return handleError(addMessageMutation.error || new Error("Failed to add message"));
    }

    setMessages((prev) => [
      ...prev,
      createMessageObj({
        ...msgData,
        citations: msgData.citations as Citation[],
      }),
    ]);

    const AIResponse = await generateAIResponseMutation.mutateAsync({
      chatId: selectedChatId,
      bookId: selectedBookId,
      chapterId: selectedChapterId,
    });

    if (generateAIResponseMutation.isError || !AIResponse) {
      return handleError(generateAIResponseMutation.error || new Error("Failed to generate AI response"));
    }

    const AIChatResponse = AIResponse as AIChatResponse;
    processCitations(AIChatResponse.content, AIChatResponse.citations);

    setMessages((prev) => [
      ...prev,
      createMessageObj({
        role: "assistant",
        created: AIChatResponse.created,
        id: AIChatResponse.messageId,
        content: processCitationsForDisplay(AIChatResponse.content, AIChatResponse.citations),
        citations: AIChatResponse.citations,
      }),
    ]);
  };

  return (
    <div className="h-full grid grid-cols gap-x-2 px-4 py-4">
      <Chat
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isGenerating={generateAIResponseMutation.isPending}
        setMessages={setMessages}
        className="overflow-y-auto"
        onCitationClick={goToCitation}
      />
    </div>
  );
}
