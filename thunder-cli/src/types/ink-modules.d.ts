declare module 'ink-select-input' {
    import { FC } from 'react';
    
    interface SelectInputProps<T = any> {
        items: Array<{
            label: string;
            value: T;
            key?: string;
        }>;
        isFocused?: boolean;
        initialIndex?: number;
        limit?: number;
        indicatorComponent?: FC<any>;
        itemComponent?: FC<any>;
        onSelect?: (item: { label: string; value: T }) => void;
        onHighlight?: (item: { label: string; value: T }) => void;
    }
    
    const SelectInput: FC<SelectInputProps>;
    export default SelectInput;
}

declare module 'ink-text-input' {
    import { FC } from 'react';
    
    interface TextInputProps {
        value: string;
        onChange: (value: string) => void;
        onSubmit?: (value: string) => void;
        placeholder?: string;
        focus?: boolean;
        mask?: string;
        highlightPastedText?: boolean;
        showCursor?: boolean;
    }
    
    const TextInput: FC<TextInputProps>;
    export default TextInput;
}

declare module 'ink-spinner' {
    import { FC } from 'react';
    
    interface SpinnerProps {
        type?: 'dots' | 'dots2' | 'dots3' | 'dots4' | 'dots5' | 'dots6' | 'dots7' | 'dots8' | 'dots9' | 'dots10' | 'dots11' | 'dots12' | 'line' | 'line2' | 'pipe' | 'simpleDots' | 'simpleDotsScrolling' | 'star' | 'star2' | 'flip' | 'hamburger' | 'growVertical' | 'growHorizontal' | 'balloon' | 'balloon2' | 'noise' | 'bounce' | 'boxBounce' | 'boxBounce2' | 'triangle' | 'arc' | 'circle' | 'squareCorners' | 'circleQuarters' | 'circleHalves' | 'squish' | 'toggle' | 'toggle2' | 'toggle3' | 'toggle4' | 'toggle5' | 'toggle6' | 'toggle7' | 'toggle8' | 'toggle9' | 'toggle10' | 'toggle11' | 'toggle12' | 'toggle13' | 'arrow' | 'arrow2' | 'arrow3' | 'bouncingBar' | 'bouncingBall' | 'smiley' | 'monkey' | 'hearts' | 'clock' | 'earth' | 'moon' | 'runner' | 'pong' | 'shark' | 'dqpb' | 'weather' | 'christmas' | 'grenade' | 'point' | 'layer';
    }
    
    const Spinner: FC<SpinnerProps>;
    export default Spinner;
}

declare module 'ink-gradient' {
    import { FC, ReactNode } from 'react';
    
    interface GradientProps {
        name?: string;
        children: ReactNode;
    }
    
    const Gradient: FC<GradientProps>;
    export default Gradient;
}

declare module 'ink-big-text' {
    import { FC } from 'react';
    
    interface BigTextProps {
        text: string;
        font?: string;
        space?: boolean;
        backgroundColor?: string;
        letterSpacing?: number;
    }
    
    const BigText: FC<BigTextProps>;
    export default BigText;
}

declare module 'ink-table' {
    import { FC } from 'react';
    
    interface TableProps {
        data: Array<Record<string, any>>;
        padding?: number;
        header?: boolean;
        cell?: FC<any>;
    }
    
    const Table: FC<TableProps>;
    export default Table;
}