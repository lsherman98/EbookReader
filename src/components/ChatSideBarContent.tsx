import { useEffect, useState } from "react";
import { Chat } from "./ui/chat";
import { Message } from "./ui/chat-message";
import { useGetMessagesByChatId } from "@/lib/api/queries";
import { useAddMessage, useGenerateAIResponse, StructuredChatResponse, Citation } from "@/lib/api/mutations";
import { handleError } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useCitationStore } from "@/lib/stores/citation-store";

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
  const navigate = useNavigate();
  const { setCurrentCitation } = useCitationStore();

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
            newCitationMap.set(textHash, { ...citation, id: textHash });
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

  const processCitationsForDisplay = (content: string, citations: Citation[]): string => {
    let processedContent = content;
    const usedCitations = new Set<string>();

    // Helper function to normalize text for comparison
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "") 
        .replace(/\s+/g, " ") 
        .trim();
    };

    const findBestCitation = (quote: string): Citation | null => {
      const normalizedQuote = normalizeText(quote);
      let bestMatch: Citation | null = null;
      let bestScore = 0;

      citations.forEach((citation) => {
        const normalizedSnippet = normalizeText(citation.text_snippet);

        // Calculate similarity score
        let score = 0;
        if (normalizedSnippet === normalizedQuote) {
          score = 100; // Perfect match
        } else if (normalizedSnippet.includes(normalizedQuote) || normalizedQuote.includes(normalizedSnippet)) {
          score = 80; // Contains match
        } else {
          // Calculate word overlap
          const quoteWords = normalizedQuote.split(" ");
          const snippetWords = normalizedSnippet.split(" ");
          const intersection = quoteWords.filter((word) => snippetWords.includes(word));
          score = (intersection.length / Math.max(quoteWords.length, snippetWords.length)) * 60;
        }

        if (score > bestScore && score > 40) {
          // Minimum threshold
          bestScore = score;
          bestMatch = citation;
        }
      });

      return bestMatch;
    };

    // Process quotes and their citations
    processedContent = processedContent.replace(/"([^"]+)"(\s*\[(\d+)\])?/g, (_, quote, __, citationIndex) => {
      const citation = findBestCitation(quote);

      if (citation) {
        const textHash = generateTextHash(citation.text_snippet);
        const citationKey = `${citation.index}-${textHash}`;

        usedCitations.add(citationKey);
        const displayNum = Array.from(usedCitations).indexOf(citationKey) + 1;
        return `"${quote}"[${displayNum}-${textHash}]()`;
      }

      // If no citation found but there was an existing citation marker, try to match by index
      if (citationIndex) {
        const indexBasedCitation = citations.find((c) => c.index === citationIndex);
        if (indexBasedCitation) {
          const textHash = generateTextHash(indexBasedCitation.text_snippet);
          const citationKey = `${indexBasedCitation.index}-${textHash}`;

          usedCitations.add(citationKey);
          const displayNum = Array.from(usedCitations).indexOf(citationKey) + 1;
          return `"${quote}"[${displayNum}-${textHash}]()`;
        }
      }

      // Return original quote without citation if no match found
      return `"${quote}"`;
    });

    // Handle any remaining citation markers that weren't part of quotes
    processedContent = processedContent.replace(/\[(\d+)\]/g, () => {
      return "";
    });

    return processedContent;
  };

  const processCitations = (answer: string, citations: Citation[]): string => {
    setCitationMap((prevMap) => {
      const newMap = new Map(prevMap);
      citations.forEach((citation) => {
        const textHash = generateTextHash(citation.text_snippet);
        newMap.set(textHash, { ...citation, id: textHash });
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
      content: originalContent,
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
        onCitationClick={goToCitation}
      />
    </div>
  );
}
