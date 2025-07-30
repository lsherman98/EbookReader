import { forwardRef, useCallback, useRef, type ReactElement } from "react";
import { ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type Message } from "@/components/ui/chat-message";
import { CopyButton } from "@/components/ui/copy-button";
import { MessageInput } from "@/components/ui/message-input";
import { MessageList } from "@/components/ui/message-list";
import { useAutoScroll } from "@/hooks/use-auto-scroll";

interface ChatPropsBase {
  handleSubmit: (event?: { preventDefault?: () => void }, options?: { experimental_attachments?: FileList }) => void;
  messages: Array<Message>;
  input: string;
  className?: string;
  handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  isGenerating: boolean;
  stop?: () => void;
  setMessages: (messages: Message[]) => void;
  onCitationClick: (citationIndex: string) => void;
}

interface ChatPropsWithoutSuggestions extends ChatPropsBase {
  append?: never;
  suggestions?: never;
}

interface ChatPropsWithSuggestions extends ChatPropsBase {
  append: (message: { role: "user"; content: string }) => void;
  suggestions: string[];
}

type ChatProps = ChatPropsWithoutSuggestions | ChatPropsWithSuggestions;

export function Chat({
  messages,
  handleSubmit,
  input,
  handleInputChange,
  isGenerating,
  className,
  onCitationClick,
}: ChatProps) {
  const isTyping = isGenerating;

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const messageOptions = useCallback(
    (message: Message) => ({
      actions: <CopyButton content={message.content} copyMessage="Copied response to clipboard!" />,
      onCitationClick,
    }),
    [onCitationClick],
  );

  return (
    <ChatContainer className={className}>
      {messages.length > 0 ? (
        <ChatMessages messages={messages}>
          <MessageList messages={messages} isTyping={isTyping} onCitationClick={onCitationClick} messageOptions={messageOptions} />
        </ChatMessages>
      ) : (
        <div className="w-full h-full flex items-center justify-center">placeholder instructions</div>
      )}

      <ChatForm className="mt-auto" isPending={isGenerating || isTyping} handleSubmit={handleSubmit}>
        {() => (
          <MessageInput
            value={input}
            onChange={handleInputChange}
            allowAttachments={false}
            isGenerating={isGenerating}
          />
        )}
      </ChatForm>
    </ChatContainer>
  );
}
Chat.displayName = "Chat";

export function ChatMessages({
  messages,
  children,
}: React.PropsWithChildren<{
  messages: Message[];
}>) {
  const { containerRef, scrollToBottom, handleScroll, shouldAutoScroll, handleTouchStart } = useAutoScroll([messages]);

  return (
    <div
      className="grid grid-cols-1 overflow-y-auto pb-4 scrollbar-none"
      ref={containerRef}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div className="max-w-full [grid-column:1/1] [grid-row:1/1]">{children}</div>

      {!shouldAutoScroll && (
        <div className="pointer-events-none flex flex-1 items-end justify-end [grid-column:1/1] [grid-row:1/1]">
          <div className="sticky bottom-0 left-0 flex w-full justify-end">
            <Button
              onClick={scrollToBottom}
              className="pointer-events-auto h-8 w-8 rounded-full ease-in-out animate-in fade-in-0 slide-in-from-bottom-1"
              size="icon"
              variant="ghost"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const ChatContainer = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("grid max-h-full w-full grid-rows-[1fr_auto]", className)} {...props} />;
  },
);
ChatContainer.displayName = "ChatContainer";

interface ChatFormProps {
  className?: string;
  isPending: boolean;
  handleSubmit: (event?: { preventDefault?: () => void }, options?: { experimental_attachments?: FileList }) => void;
  children: (props: {
    files: File[] | null;
    setFiles: React.Dispatch<React.SetStateAction<File[] | null>>;
  }) => ReactElement;
}

export const ChatForm = forwardRef<HTMLFormElement, ChatFormProps>(({ children, handleSubmit, className }, ref) => {
  const onSubmit = (event: React.FormEvent) => {
    handleSubmit(event);
  };

  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      {children({ files: null, setFiles: () => {} })}
    </form>
  );
});
ChatForm.displayName = "ChatForm";
