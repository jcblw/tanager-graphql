import { FC, Dispatch, SetStateAction } from 'react'
import { FinchDevtools, FinchDevToolsMessageType } from 'finch-graphql'
import { usePort } from '../hooks/usePort'
import {
  FinchDevtoolsIncomingMessage,
  FinchDevtoolsMessage,
} from './MessageViewer/types'
import { useEffect } from 'react'

interface PortConnectionProps {
  extensionId: string
  setMessages: Dispatch<SetStateAction<FinchDevtoolsMessage[]>>
  setMessageKey: Dispatch<SetStateAction<string>>
  isRecording: boolean
  onDisconnected: () => void
  onConnected: () => void
}

/**
 * PortConnection is a component that holds the usePort hook.
 * This is a headless component and does not return any view.
 */
export const PortConnection: FC<PortConnectionProps> = ({
  extensionId,
  setMessages,
  setMessageKey,
  isRecording,
  onDisconnected,
  onConnected,
}) => {
  const port = usePort({
    extensionId,
    portName: FinchDevtools.portName,
    dependencies: [isRecording],
    onMessage: (message: FinchDevtoolsIncomingMessage) => {
      switch (message.type) {
        case FinchDevToolsMessageType.Start:
          if (isRecording) {
            setMessages(messages => [...messages, message])
          }
          break
        case FinchDevToolsMessageType.Response:
          if (isRecording) {
            setMessages(messages => {
              const foundMessage = messages.find(
                existingMessage => existingMessage.id === message.id,
              )
              if (!foundMessage) {
                return messages
              }
              const index = messages.indexOf(foundMessage)
              return [
                ...messages.slice(0, index),
                { ...foundMessage, ...message },
                ...messages.slice(index + 1),
              ]
            })
          }
          break
        case FinchDevToolsMessageType.MessageKey:
          setMessageKey(message.messageKey)
          break
      }
    },
  })

  useEffect(() => {
    if (port) {
      /**
       * request the current ports message key to auto configure the project.
       */
      port.postMessage({ type: FinchDevToolsMessageType.RequestMessageKey })
      onConnected()
    } else {
      onDisconnected()
    }
  }, [port])

  return null
}
