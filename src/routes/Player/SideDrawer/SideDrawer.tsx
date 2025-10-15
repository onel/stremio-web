// Copyright (C) 2017-2024 Smart code 203358507

import React, { useMemo, useCallback, useState, forwardRef, memo, useRef } from 'react';
import classNames from 'classnames';
import Icon from '@stremio/stremio-icons/react';
import { useServices } from 'stremio/services';
import { CONSTANTS } from 'stremio/common';
import { MetaPreview, Video } from 'stremio/components';
import SeasonsBar from 'stremio/routes/MetaDetails/VideosList/SeasonsBar';
import styles from './SideDrawer.less';

/**
 * Props for the SideDrawer component
 */
type Props = {
    className?: string;
    seriesInfo: SeriesInfo;
    metaItem: MetaItem;
    closeSideDrawer: () => void;
    selected: string;
    transitionEnded: boolean;
};

/**
 * A side drawer component that displays metadata and video list for a series.
 * Filters videos by season and provides controls for marking videos as watched.
 * Automatically scrolls to the selected video after transition completes.
 */
const SideDrawer = memo(forwardRef<HTMLDivElement, Props>(({ seriesInfo, className, closeSideDrawer, selected, ...props }: Props, ref) => {
    const { core } = useServices();
    const [season, setSeason] = useState<number>(seriesInfo?.season);
    const selectedVideoRef = useRef<HTMLDivElement>(null);
    const metaItem = useMemo(() => {
        return seriesInfo ?
            {
                ...props.metaItem,
                links: props.metaItem.links.filter(({ category }) => category === CONSTANTS.SHARE_LINK_CATEGORY)
            }
            :
            props.metaItem;
    }, [props.metaItem]);
    const videos = useMemo(() => {
        return Array.isArray(metaItem.videos) ?
            metaItem.videos.filter((video) => video.season === season)
            :
            metaItem.videos;
    }, [metaItem, season]);
    const seasons = useMemo(() => {
        return props.metaItem.videos
            .map(({ season }) => season)
            .filter((season, index, seasons) => {
                return seasons.indexOf(season) === index;
            })
            .sort((a, b) => (a || Number.MAX_SAFE_INTEGER) - (b || Number.MAX_SAFE_INTEGER));
    }, [props.metaItem.videos]);

    /**
     * Updates the selected season when a new season is chosen from the seasons bar
     */
    const seasonOnSelect = useCallback((event: { value: string }) => {
        setSeason(parseInt(event.value));
    }, []);

    const seasonWatched = React.useMemo(() => {
        return videos.every((video) => video.watched);
    }, [videos]);

    /**
     * Dispatches an action to toggle the watched status of a video
     */
    const onMarkVideoAsWatched = useCallback((video: Video, watched: boolean) => {
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'MarkVideoAsWatched',
                args: [video, !watched]
            }
        });
    }, []);

    /**
     * Dispatches an action to toggle the watched status of all videos in a season
     * @param season - The season number to mark
     * @param watched - Current watched status to toggle
     */
    const onMarkSeasonAsWatched = (season: number, watched: boolean) => {
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'MarkSeasonAsWatched',
                args: [season, !watched]
            }
        });
    };

    /**
     * Prevents event propagation to avoid closing the drawer when clicking inside it
     * @param event - The mouse event to stop
     */
    const onMouseDown = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    /**
     * Scrolls the selected video into view after the drawer transition completes
     */
    const onTransitionEnd = () => {
        selectedVideoRef.current?.scrollIntoView({
            behavior: 'smooth',
        });
    };

    return (
        <div ref={ref} className={classNames(styles['side-drawer'], className)} onMouseDown={onMouseDown} onTransitionEnd={onTransitionEnd}>
            <div className={styles['close-button']} onClick={closeSideDrawer}>
                <Icon className={styles['icon']} name={'chevron-forward'} />
            </div>
            <div className={styles['info']}>
                <MetaPreview
                    className={styles['side-drawer-meta-preview']}
                    compact={true}
                    name={metaItem.name}
                    logo={metaItem.logo}
                    runtime={metaItem.runtime}
                    releaseInfo={metaItem.releaseInfo}
                    released={metaItem.released}
                    description={metaItem.description}
                    links={metaItem.links}
                />
            </div>
            {
                seriesInfo ?
                    <div className={styles['series-content']}>
                        <SeasonsBar
                            season={season}
                            seasons={seasons}
                            onSelect={seasonOnSelect}
                        />
                        <div className={styles['videos']}>
                            {videos.map((video, index) => (
                                <Video
                                    key={index}
                                    ref={video.id === selected ? selectedVideoRef : null}
                                    className={styles['video']}
                                    id={video.id}
                                    title={video.title}
                                    thumbnail={video.thumbnail}
                                    season={video.season}
                                    episode={video.episode}
                                    released={video.released}
                                    upcoming={video.upcoming}
                                    watched={video.watched}
                                    seasonWatched={seasonWatched}
                                    progress={video.progress}
                                    deepLinks={video.deepLinks}
                                    scheduled={video.scheduled}
                                    onMarkVideoAsWatched={onMarkVideoAsWatched}
                                    onMarkSeasonAsWatched={onMarkSeasonAsWatched}
                                />
                            ))}
                        </div>
                    </div>
                    : null
            }

        </div>
    );
}));

export default SideDrawer;
