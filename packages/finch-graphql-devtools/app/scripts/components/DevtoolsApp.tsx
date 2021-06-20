import { queryApi, FinchMessageKey } from 'finch-graphql'
import { useMemo } from 'react'
import { Tabs, TabPanels, TabPanel } from '@chakra-ui/react'
import GraphiQL, { Fetcher } from 'graphiql'
import { Header } from './Header'
import { SettingsEditor } from './SettingsEditor'
import { StorageKey, DefaultQuery } from '../constants'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { MessagesViewer } from './MessageViewer'
import { useColorScheme } from '../hooks/useColorScheme'

export const graphQLFetcher = ({
  messageKey,
  extensionId,
}: {
  messageKey: string
  extensionId: string
}): Fetcher => async ({ query, variables }) => {
  return queryApi(query, variables || {}, {
    messageKey,
    id: extensionId,
  })
}

export const DevtoolsApp = () => {
  const scheme = useColorScheme()

  const [extensionId, setExtensionId] = useLocalStorage(
    StorageKey.ExtensionId,
    '',
  )
  const [messageKey, setMessageKey] = useLocalStorage<string>(
    StorageKey.MessageKey,
    FinchMessageKey.Generic,
  )
  const [tabIndex, setTabIndex] = useLocalStorage(StorageKey.TabIndex, 0)

  const fetcher = useMemo(() => {
    return graphQLFetcher({ messageKey, extensionId })
  }, [messageKey, extensionId])

  return (
    <Tabs
      colorScheme="blue"
      onChange={index => setTabIndex(index)}
      defaultIndex={tabIndex}
      display="flex"
      flexDirection="column"
      height="100%"
    >
      <Header />
      <TabPanels display="flex" flexDirection="column" height="100%">
        <TabPanel p="0" height="100%">
          <GraphiQL fetcher={fetcher} defaultQuery={DefaultQuery} />
        </TabPanel>
        <TabPanel p="0" height="100%">
          <MessagesViewer extensionId={extensionId} messageKey={messageKey} />
        </TabPanel>
        <TabPanel p="0" height="100%">
          <SettingsEditor
            extensionId={extensionId}
            onChangeExtensionId={id => {
              if (typeof id === 'string') {
                setExtensionId(id)
              } else {
                setExtensionId(id.target.value)
              }
            }}
            messageKey={messageKey}
            onChangeMessageKey={e => {
              setMessageKey(e.target.value)
            }}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
