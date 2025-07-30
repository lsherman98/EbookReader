import { useEffect, useState } from "react";
import { Chat } from "./ui/chat";
import { Message } from "./ui/chat-message";
import { useGetMessagesByChatId } from "@/lib/api/queries";
import { useAddMessage, useGenerateAIResponse, StructuredChatResponse, Citation } from "@/lib/api/mutations";
import { handleError } from "@/lib/utils";

const generateTextHash = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
};

export function ChatSideBarContent({
  selectedChatId,
  selectedBookId,
  selectedChapterId,
}: {
  selectedChatId: string | undefined;
  selectedBookId: string;
  selectedChapterId: string | undefined;
}) {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [citationMap, setCitationMap] = useState<Map<string, Citation>>(new Map());

  const { data: messagesData, isPending: isMessagesPending } = useGetMessagesByChatId(selectedChatId);

  const addMessageMutation = useAddMessage();
  const generateAiResponseMutation = useGenerateAIResponse();

  useEffect(() => {
    if (!isMessagesPending && messagesData && "expand" in messagesData && messagesData.expand?.messages) {
      const loadedMessages = messagesData.expand?.messages as Message[];

      const processedMessages = loadedMessages.map((message) => {
        if (message.role === "assistant" && message.citations && Array.isArray(message.citations)) {
          const processedContent = processCitationsForDisplay(message.content, message.citations);
          return { ...message, content: processedContent };
        }
        return message;
      });

      setMessages(processedMessages);

      const newCitationMap = new Map<string, Citation>();
      loadedMessages.forEach((message) => {
        if (message.citations && Array.isArray(message.citations)) {
          message.citations.forEach((citation) => {
            const textHash = generateTextHash(citation.text_snippet);
            const uniqueKey = `${citation.index}_${textHash}`;
            newCitationMap.set(uniqueKey, { ...citation, uniqueId: uniqueKey });
          });
        }
      });
      setCitationMap(newCitationMap);
    } else if (!isMessagesPending && messagesData) {
      setMessages([]);
      setCitationMap(new Map());
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
    citations?: Citation[] | null;
  }): Message => {
    return {
      content: data.content,
      role: data.role,
      id: data.id,
      createdAt: new Date(data.created),
      citations: data.citations || null,
    };
  };

  const scrollToCitation = (citationIndex: string) => {
    console.log(citationMap);
    console.log("Scrolling to citation:", citationIndex);
    console.log("Citation", citationMap.get(citationIndex));
  };

  const processCitationsForDisplay = (content: string, citations: Citation[]): string => {
    let processedContent = content;
    let displayIndex = 0;

    processedContent = processedContent.replace(/\[(\d+)\]/g, (match, citationIndex) => {
      const matchingCitation = citations.find((c) => c.index === citationIndex);
      if (matchingCitation) {
        const textHash = generateTextHash(matchingCitation.text_snippet);
        const uniqueKey = `${citationIndex}_${textHash}`;
        displayIndex += 1;
        return `[${displayIndex}-${uniqueKey}]()`;
      }
      return match;
    });

    return processedContent;
  };

  const processCitations = (answer: string, citations: Citation[]): string => {
    setCitationMap((prevMap) => {
      const newMap = new Map(prevMap);
      citations.forEach((citation) => {
        const textHash = generateTextHash(citation.text_snippet);
        const uniqueKey = `${citation.index}_${textHash}`;
        newMap.set(uniqueKey, { ...citation, uniqueId: uniqueKey });
      });
      return newMap;
    });

    return answer;
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
      parts: null,
    });
    if (!data) {
      handleError(new Error("Failed to add message"));
      return;
    }

    let message = createMessageObject({
      ...data,
      citations: data.citations as Citation[] | null,
    });
    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);

    const aiResponse = await generateAiResponseMutation.mutateAsync({
      messages: updatedMessages,
      chatId: selectedChatId,
      bookId: selectedBookId,
      chapterId: selectedChapterId,
    });
    if (!aiResponse) {
      handleError(new Error("Failed to generate AI response"));
      return;
    }

    const structuredResponse = aiResponse as StructuredChatResponse;

    const originalContent = structuredResponse.content;

    processCitations(originalContent, structuredResponse.parts);

    data = await addMessageMutation.mutateAsync({
      chatId: selectedChatId,
      content: originalContent, // Store original content
      role: "assistant",
      parts: structuredResponse.parts,
    });
    if (!data) {
      handleError(new Error("Failed to add AI response message"));
      return;
    }

    const processedContentForDisplay = processCitationsForDisplay(originalContent, structuredResponse.parts);

    message = createMessageObject({
      ...data,
      content: processedContentForDisplay, 
      citations: data.citations as Citation[] | null,
    });
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
        onCitationClick={scrollToCitation}
      />
    </div>
  );
}
