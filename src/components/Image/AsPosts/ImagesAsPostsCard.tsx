import { Carousel, Embla } from '@mantine/carousel';
import { ActionIcon, Group, Menu, Paper, Tooltip, createStyles, Stack, Badge } from '@mantine/core';
import HoverActionButton from '~/components/Cards/components/HoverActionButton';
import { IconExclamationMark, IconInfoCircle, IconBrush, IconMessage } from '@tabler/icons-react';
import { truncate } from 'lodash-es';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DaysFromNow } from '~/components/Dates/DaysFromNow';
import { RoutedDialogLink } from '~/components/Dialog/RoutedDialogProvider';
import { EdgeMedia } from '~/components/EdgeMedia/EdgeMedia';
import { useImagesAsPostsInfiniteContext } from '~/components/Image/AsPosts/ImagesAsPostsInfinite';
import { useToggleGallerySettings } from '~/components/Image/AsPosts/gallery.utils';
import { OnsiteIndicator } from '~/components/Image/Indicators/OnsiteIndicator';
import { MediaHash } from '~/components/ImageHash/ImageHash';
import { ImageMetaPopover } from '~/components/ImageMeta/ImageMeta';
import { MasonryCard } from '~/components/MasonryGrid/MasonryCard';
import { Reactions } from '~/components/Reaction/Reactions';
import { UserAvatar } from '~/components/UserAvatar/UserAvatar';
import { useInView } from '~/hooks/useInView';
import { constants } from '~/server/common/constants';
import { ImagesAsPostModel } from '~/server/controllers/image.controller';
import { generationPanel } from '~/store/generation.store';
import { useFeatureFlags } from '~/providers/FeatureFlagsProvider';
import { trpc } from '~/utils/trpc';
import { ImageGuard2 } from '~/components/ImageGuard/ImageGuard2';
import { ImageContextMenu } from '~/components/Image/ContextMenu/ImageContextMenu';
import { ThumbsDownIcon, ThumbsUpIcon } from '~/components/ThumbsIcon/ThumbsIcon';

export function ImagesAsPostsCard({
  data,
  width: cardWidth,
  height,
}: {
  data: ImagesAsPostModel;
  width: number;
  height: number;
}) {
  const { ref, inView } = useInView({ rootMargin: '200%' });
  const { classes } = useStyles();
  const features = useFeatureFlags();
  const queryUtils = trpc.useUtils();

  const { modelVersions, showModerationOptions, model, filters } =
    useImagesAsPostsInfiniteContext();
  const targetModelVersion = modelVersions?.find((x) => x.id === data.modelVersionId);
  const modelVersionName = targetModelVersion?.name;
  const postId = data.postId ?? undefined;

  const image = data.images[0];
  const carouselHeight = height - 58 - 8;

  const [embla, setEmbla] = useState<Embla | null>(null);
  const [slidesInView, setSlidesInView] = useState<number[]>([]);

  const { data: gallerySettings } = trpc.model.getGallerySettings.useQuery({ id: model.id });
  const toggleGallerySettings = useToggleGallerySettings({ modelId: model.id });

  const handleUpdateGallerySettings = async ({
    imageId,
    user,
  }: {
    imageId?: number;
    user?: { id: number; username: string | null };
  }) => {
    if (showModerationOptions && model) {
      await toggleGallerySettings({
        modelId: model.id,
        images: imageId ? [{ id: imageId }] : undefined,
        users: user ? [user] : undefined,
      }).catch(() => null); // Error is handled in the mutation events

      if (filters.hidden)
        // Refetch the query to update the hidden images
        await queryUtils.image.getImagesAsPostsInfinite.invalidate({ ...filters });
    }
  };

  useEffect(() => {
    if (!embla) return;
    setSlidesInView(embla.slidesInView(true));
    const onSelect = () => setSlidesInView([...embla.slidesInView(true), ...embla.slidesInView()]);
    embla.on('select', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla]);

  const imageIdsString = data.images.map((x) => x.id).join('_');
  const carouselKey = useMemo(() => `${imageIdsString}_${cardWidth}`, [imageIdsString, cardWidth]);

  const moderationOptions = (image: (typeof data.images)[number]) => {
    if (!showModerationOptions) return null;
    const imageAlreadyHidden = gallerySettings
      ? gallerySettings.hiddenImages.indexOf(image.id) > -1
      : false;
    const userAlreadyHidden = gallerySettings
      ? gallerySettings.hiddenUsers.findIndex((u) => u.id === image.user.id) > -1
      : false;

    return (
      <>
        <Menu.Label key="menu-label">Gallery Moderation</Menu.Label>
        <Menu.Item
          key="hide-image-gallery"
          onClick={() => handleUpdateGallerySettings({ imageId: image.id })}
        >
          {imageAlreadyHidden ? 'Unhide image from gallery' : 'Hide image from gallery'}
        </Menu.Item>
        <Menu.Item
          key="hide-user-gallery"
          onClick={() => handleUpdateGallerySettings({ user: image.user })}
        >
          {userAlreadyHidden ? 'Show content from this user' : 'Hide content from this user'}
        </Menu.Item>
      </>
    );
  };

  const isThumbsUp = !!data.review?.recommended;

  return (
    <MasonryCard withBorder shadow="sm" p={0} height={height} ref={ref} className={classes.card}>
      <Paper p="xs" radius={0}>
        {inView && (
          <Group align="flex-start" noWrap maw="100%">
            <UserAvatar
              user={data.user}
              subText={
                <>
                  {data.publishedAt ? <DaysFromNow date={data.publishedAt} /> : 'Not published'} -{' '}
                  {modelVersionName ?? 'Cross-post'}
                </>
              }
              subTextForce
              size="md"
              spacing="xs"
              withUsername
              linkToProfile
            />
            <Group ml="auto" noWrap>
              {!data.publishedAt && (
                <Tooltip label="Post not Published" withArrow>
                  <Link href={`/posts/${data.postId}/edit`}>
                    <ActionIcon color="red" variant="outline">
                      <IconExclamationMark />
                    </ActionIcon>
                  </Link>
                </Tooltip>
              )}
              {data.review ? (
                <RoutedDialogLink name="resourceReview" state={{ reviewId: data.review.id }}>
                  <Badge
                    variant="light"
                    radius="md"
                    size="lg"
                    style={{ userSelect: 'none', padding: 4, height: 'auto' }}
                    color={isThumbsUp ? 'success.5' : 'red'}
                  >
                    <Group spacing={4} noWrap>
                      {isThumbsUp ? <ThumbsUpIcon filled /> : <ThumbsDownIcon filled />}
                      {data.review.details && <IconMessage size={18} strokeWidth={2.5} />}
                    </Group>
                  </Badge>
                </RoutedDialogLink>
              ) : null}
            </Group>
          </Group>
        )}
      </Paper>
      <div className={classes.container}>
        <div className={classes.blurHash}>
          <MediaHash {...data.images[0]} />
        </div>
        <div className={classes.content} style={{ opacity: inView ? 1 : 0 }}>
          {inView && (
            <>
              {data.images.length === 1 ? (
                <ImageGuard2 image={image}>
                  {(safe) => (
                    <div className={classes.imageContainer}>
                      {image.meta && 'civitaiResources' in (image.meta as object) && (
                        <OnsiteIndicator />
                      )}
                      <ImageGuard2.BlurToggle className="absolute top-2 left-2 z-10" />
                      {safe && (
                        <Stack spacing="xs" className="absolute top-2 right-2 z-10">
                          <ImageContextMenu
                            image={image}
                            additionalMenuItems={moderationOptions(image)}
                          />
                          {features.imageGeneration && image.meta && (
                            <HoverActionButton
                              label="Remix"
                              size={30}
                              color="white"
                              variant="filled"
                              data-activity="remix:model-gallery"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                generationPanel.open({
                                  type: 'image',
                                  id: image.id,
                                });
                              }}
                            >
                              <IconBrush stroke={2.5} size={16} />
                            </HoverActionButton>
                          )}
                        </Stack>
                      )}
                      <RoutedDialogLink
                        name="imageDetail"
                        state={{ imageId: image.id, images: [image] }}
                        className={classes.link}
                      >
                        <>
                          {safe && (
                            <EdgeMedia
                              src={image.url}
                              name={image.name ?? image.id.toString()}
                              alt={
                                image.meta
                                  ? truncate(image.meta.prompt, {
                                      length: constants.altTruncateLength,
                                    })
                                  : image.name ?? undefined
                              }
                              type={image.type}
                              width={450}
                              placeholder="empty"
                              className={classes.image}
                              wrapperProps={{ style: { zIndex: 1 } }}
                              fadeIn
                            />
                          )}
                        </>
                      </RoutedDialogLink>

                      <Reactions
                        entityId={image.id}
                        entityType="image"
                        reactions={image.reactions}
                        metrics={{
                          likeCount: image.stats?.likeCountAllTime,
                          dislikeCount: image.stats?.dislikeCountAllTime,
                          heartCount: image.stats?.heartCountAllTime,
                          laughCount: image.stats?.laughCountAllTime,
                          cryCount: image.stats?.cryCountAllTime,
                          tippedAmountCount: image.stats?.tippedAmountCountAllTime,
                        }}
                        readonly={!safe}
                        className={classes.reactions}
                        targetUserId={image.user.id}
                      />
                      {!image.hideMeta && image.meta && (
                        <ImageMetaPopover
                          meta={image.meta}
                          generationProcess={image.generationProcess ?? undefined}
                          imageId={image.id}
                          mainResourceId={image.modelVersionId ?? undefined}
                        >
                          <ActionIcon className={classes.info} variant="transparent" size="lg">
                            <IconInfoCircle
                              color="white"
                              filter="drop-shadow(1px 1px 2px rgb(0 0 0 / 50%)) drop-shadow(0px 5px 15px rgb(0 0 0 / 60%))"
                              opacity={0.8}
                              strokeWidth={2.5}
                              size={26}
                            />
                          </ActionIcon>
                        </ImageMetaPopover>
                      )}
                    </div>
                  )}
                </ImageGuard2>
              ) : (
                <Carousel
                  key={carouselKey}
                  withControls
                  draggable
                  loop
                  style={{ flex: 1 }}
                  withIndicators
                  controlSize={32}
                  height={carouselHeight}
                  getEmblaApi={setEmbla}
                  styles={{
                    indicators: {
                      bottom: -8,
                      zIndex: 5,
                      display: 'flex',
                      gap: 1,
                    },
                    indicator: {
                      width: 'auto',
                      height: 8,
                      flex: 1,
                      transition: 'width 250ms ease',
                      borderRadius: 0,
                      boxShadow: '0 0 3px rgba(0, 0, 0, .3)',
                    },
                  }}
                >
                  {data.images.map((image, index) => (
                    <Carousel.Slide key={image.id}>
                      {slidesInView.includes(index) && (
                        <ImageGuard2 image={image} connectType="post" connectId={postId}>
                          {(safe) => (
                            <div className={classes.imageContainer}>
                              {image.meta && 'civitaiResources' in (image.meta as object) && (
                                <OnsiteIndicator />
                              )}
                              <ImageGuard2.BlurToggle className="absolute top-2 left-2 z-10" />
                              {safe && (
                                <Stack spacing="xs" className="absolute top-2 right-2 z-10">
                                  <ImageContextMenu
                                    image={image}
                                    additionalMenuItems={moderationOptions(image)}
                                  />
                                  {features.imageGeneration && image.meta && (
                                    <HoverActionButton
                                      label="Remix"
                                      size={30}
                                      color="white"
                                      variant="filled"
                                      data-activity="remix:model-gallery"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        generationPanel.open({
                                          type: 'image',
                                          id: image.id,
                                        });
                                      }}
                                    >
                                      <IconBrush stroke={2.5} size={16} />
                                    </HoverActionButton>
                                  )}
                                </Stack>
                              )}
                              <RoutedDialogLink
                                name="imageDetail"
                                state={{ imageId: image.id, images: data.images }}
                                className={classes.link}
                              >
                                <>
                                  <div className={classes.blurHash}>
                                    <MediaHash {...image} />
                                  </div>
                                  {safe && (
                                    <EdgeMedia
                                      src={image.url}
                                      name={image.name ?? image.id.toString()}
                                      alt={
                                        image.meta
                                          ? truncate(image.meta.prompt, {
                                              length: constants.altTruncateLength,
                                            })
                                          : image.name ?? undefined
                                      }
                                      type={image.type}
                                      width={450}
                                      placeholder="empty"
                                      className={classes.image}
                                      wrapperProps={{ style: { zIndex: 1 } }}
                                      fadeIn
                                    />
                                  )}
                                </>
                              </RoutedDialogLink>
                              <Reactions
                                entityId={image.id}
                                entityType="image"
                                reactions={image.reactions}
                                metrics={{
                                  likeCount: image.stats?.likeCountAllTime,
                                  dislikeCount: image.stats?.dislikeCountAllTime,
                                  heartCount: image.stats?.heartCountAllTime,
                                  laughCount: image.stats?.laughCountAllTime,
                                  cryCount: image.stats?.cryCountAllTime,
                                  tippedAmountCount: image.stats?.tippedAmountCountAllTime,
                                }}
                                readonly={!safe}
                                className={classes.reactions}
                                targetUserId={image.user.id}
                              />
                              {!image.hideMeta && image.meta && (
                                <ImageMetaPopover
                                  meta={image.meta}
                                  generationProcess={image.generationProcess ?? undefined}
                                  imageId={image.id}
                                  mainResourceId={image.modelVersionId ?? undefined}
                                >
                                  <ActionIcon
                                    className={classes.info}
                                    variant="transparent"
                                    size="lg"
                                  >
                                    <IconInfoCircle
                                      color="white"
                                      filter="drop-shadow(1px 1px 2px rgb(0 0 0 / 50%)) drop-shadow(0px 5px 15px rgb(0 0 0 / 60%))"
                                      opacity={0.8}
                                      strokeWidth={2.5}
                                      size={26}
                                    />
                                  </ActionIcon>
                                </ImageMetaPopover>
                              )}
                            </div>
                          )}
                        </ImageGuard2>
                      )}
                    </Carousel.Slide>
                  ))}
                </Carousel>
              )}
            </>
          )}
        </div>
      </div>
    </MasonryCard>
  );
}

const useStyles = createStyles((theme) => ({
  title: {
    lineHeight: 1.1,
    fontSize: 14,
    color: 'white',
    fontWeight: 500,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'auto !important',
  },
  link: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  slide: {
    display: 'flex',
    flexDirection: 'column',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // paddingBottom: 42,
    // background: theme.colors.dark[9],
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topRight: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 10,
  },
  contentOverlay: {
    position: 'absolute',
    width: '100%',
    left: 0,
    zIndex: 10,
    padding: theme.spacing.sm,
  },
  top: { top: 0 },
  reactions: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: theme.radius.sm,
    background: theme.fn.rgba(
      theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[0],
      0.8
    ),
    // backdropFilter: 'blur(13px) saturate(160%)',
    boxShadow: '0 -2px 6px 1px rgba(0,0,0,0.16)',
    padding: 4,
    zIndex: 1,
  },
  blurHash: {
    opacity: 0.7,
    zIndex: 1,
  },
  container: {
    position: 'relative',
    flex: 1,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transition: theme.other.fadeIn,
    opacity: 0,
    zIndex: 2,
  },
  info: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    zIndex: 1,
  },
  statBadge: {
    background: 'rgba(212,212,212,0.2)',
    // backdropFilter: 'blur(7px)',
    cursor: 'pointer',
  },
  image: {
    width: '100%',
    zIndex: 1,
    // position: 'absolute',
    // top: '50%',
    // left: 0,
    // transform: 'translateY(-50%)',
  },
}));
