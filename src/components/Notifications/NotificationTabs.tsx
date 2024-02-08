import { Badge, Tabs, TabsProps, Text, createStyles } from '@mantine/core';
import { NotificationCategory } from '@prisma/client';
import { useQueryNotificationsCount } from '~/components/Notifications/notifications.utils';
import { abbreviateNumber } from '~/utils/number-helpers';
import { getDisplayName } from '~/utils/string-helpers';

const tabs = ['all', ...Object.values(NotificationCategory)];

const useStyles = createStyles(() => ({
  tab: {
    padding: '8px 12px',
  },
}));

export function NotificationTabs({ onTabChange, ...tabsProps }: Props) {
  const { classes } = useStyles();
  const count = useQueryNotificationsCount();

  const handleTabChange = (value: string | null) => {
    onTabChange?.(value !== 'all' ? value : null);
  };

  return (
    <Tabs
      classNames={classes}
      variant="pills"
      radius="xl"
      color="gray"
      defaultValue="all"
      onTabChange={handleTabChange}
      {...tabsProps}
    >
      <Tabs.List sx={{ flexWrap: 'nowrap', overflow: 'auto hidden' }}>
        {tabs.map((tab) => {
          const countValue = count[tab.toLowerCase() as keyof typeof count];

          return (
            <Tabs.Tab
              key={tab}
              value={tab}
              rightSection={
                tab !== 'all' && countValue ? (
                  <Badge color="red" variant="filled" size="xs" radius="xl">
                    <Text size="xs">{abbreviateNumber(countValue)}</Text>
                  </Badge>
                ) : undefined
              }
            >
              <Text tt="capitalize" weight={590} inline>
                {getDisplayName(tab)}
              </Text>
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
    </Tabs>
  );
}

type Props = Omit<TabsProps, 'children'>;
