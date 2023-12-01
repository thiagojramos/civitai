import { Group, SegmentedControl, Stack, Title, createStyles } from '@mantine/core';
import { useRouter } from 'next/router';

import { Announcements } from '~/components/Announcements/Announcements';
import { BountiesInfinite } from '~/components/Bounty/Infinite/BountiesInfinite';
import { SortFilter } from '~/components/Filters';
import { FullHomeContentToggle } from '~/components/HomeContentToggle/FullHomeContentToggle';
import { MasonryContainer } from '~/components/MasonryColumns/MasonryContainer';
import { MasonryProvider } from '~/components/MasonryColumns/MasonryProvider';
import { Meta } from '~/components/Meta/Meta';
import { constants } from '~/server/common/constants';
import { createServerSideProps } from '~/server/utils/server-side-helpers';
import { env } from '~/env/client.mjs';
import { useFeatureFlags } from '~/providers/FeatureFlagsProvider';
import { HomeContentToggle } from '~/components/HomeContentToggle/HomeContentToggle';
import { ClubsInfinite } from '~/components/Club/Infinite/ClubsInfinite';

export const getServerSideProps = createServerSideProps({
  useSession: true,
  resolver: async ({ features }) => {
    if (!features?.bounties) return { notFound: true };
  },
});

const useStyles = createStyles((theme) => ({
  label: {
    padding: '6px 16px',
    textTransform: 'capitalize',
    backgroundColor:
      theme.colorScheme === 'dark'
        ? theme.fn.rgba(theme.colors.gray[3], 0.06)
        : theme.fn.rgba(theme.colors.gray[9], 0.06),
  },
  labelActive: {
    backgroundColor: 'transparent',
    '&,&:hover': {
      color: theme.colors.dark[9],
    },
  },
  active: {
    backgroundColor: theme.white,
  },
  root: {
    backgroundColor: 'transparent',
    gap: 8,

    [theme.fn.smallerThan('sm')]: {
      overflow: 'auto hidden',
      maxWidth: '100%',
    },
  },
  control: { border: 'none !important' },

  filtersWrapper: {
    [theme.fn.smallerThan('sm')]: {
      width: '100%',

      '> *': { flexGrow: 1 },
    },
  },
}));

export default function ClubsPage() {
  const { classes } = useStyles();
  const features = useFeatureFlags();
  const router = useRouter();
  const query = router.query;

  const engagement = constants.clubs.engagementTypes.find(
    (type) => type === ((query.engagement as string) ?? '').toLowerCase()
  );

  const handleEngagementChange = (value: string) => {
    router.push({ query: { engagement: value } }, '/clubs', { shallow: true });
  };

  return (
    <>
      <Meta
        title="Join & Support creators on Civitai Clubs"
        description="Create, join and share your own Civitai Clubs."
        links={[{ href: `${env.NEXT_PUBLIC_BASE_URL}/bounties`, rel: 'canonical' }]}
      />
      <MasonryProvider
        columnWidth={constants.cardSizes.club}
        maxColumnCount={7}
        maxSingleColumnWidth={450}
      >
        <MasonryContainer fluid>
          <Stack spacing="xs">
            <Announcements
              sx={(theme) => ({
                marginBottom: -35,
                [theme.fn.smallerThan('md')]: {
                  marginBottom: -5,
                },
              })}
            />
            <Group position="apart" spacing={8}>
              {features.alternateHome ? <FullHomeContentToggle /> : <HomeContentToggle />}
            </Group>
            {query.engagement && (
              <Stack spacing="xl" align="flex-start">
                <Title>My Clubs</Title>
                <SegmentedControl
                  classNames={classes}
                  transitionDuration={0}
                  radius="xl"
                  mb="xl"
                  data={[...constants.clubs.engagementTypes]}
                  value={query.engagement as string}
                  onChange={handleEngagementChange}
                />
              </Stack>
            )}
            <ClubsInfinite filters={{ engagement }} />
          </Stack>
        </MasonryContainer>
      </MasonryProvider>
    </>
  );
}
