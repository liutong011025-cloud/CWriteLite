import type {BubblePlacement} from '@/lib/drama-bubble-layout';

export default function DramaConnector({placement,thought}:{placement:BubblePlacement;thought:boolean}) {
    const {side,anchor}=placement;
    return thought?<span className={'drama-round-connector connector-'+side} style={{'--connector-anchor':anchor+'px'} as React.CSSProperties} aria-hidden="true"><i/><i/><i/></span>:<span className={'drama-point-connector connector-'+side} style={{'--connector-anchor':anchor+'px'} as React.CSSProperties} aria-hidden="true"/>;
}
