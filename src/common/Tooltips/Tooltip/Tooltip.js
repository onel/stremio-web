// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const useTooltip = require('../useTooltip');
const styles = require('./styles');

/**
 * Generates a random alphanumeric identifier.
 */
const createId = () => (Math.random() + 1).toString(36).substring(7);

/**
 * A tooltip component that renders an invisible placeholder and manages tooltip display
 * through a context-based tooltip system. The tooltip is shown when the parent element
 * is hovered and hidden when the mouse leaves. The component registers itself with the
 * tooltip context on mount and cleans up on unmount.
 * @returns {JSX.Element} An invisible div placeholder that enables tooltip functionality for its parent element.
 */
const Tooltip = ({ label, position, margin = 15 }) => {
    const tooltip = useTooltip();

    const id = React.useRef(createId());
    const element = React.useRef(null);

    /**
     * Activates the tooltip by updating its state in the context.
     */
    const onMouseEnter = () => {
        tooltip.update(id.current, {
            active: true,
        });
    };

    /**
     * Deactivates the tooltip by updating its state in the context.
     */
    const onMouseLeave = () => {
        tooltip.update(id.current, {
            active: false,
        });
    };

    /**
     * Updates the tooltip label in the context whenever the label prop changes.
     */
    React.useEffect(() => {
        tooltip.update(id.current, {
            label,
        });
    }, [label]);

    /**
     * Registers the tooltip with the context and attaches mouse event listeners to the
     * parent element. Cleans up by removing event listeners and unregistering the tooltip
     * when the component unmounts.
     */
    React.useLayoutEffect(() => {
        if (element.current && element.current.parentElement) {
            const parentElement = element.current.parentElement;
            tooltip.add({
                id: id.current,
                label,
                position,
                margin,
                parent: parentElement,
            });

            parentElement.addEventListener('mouseenter', onMouseEnter);
            parentElement.addEventListener('mouseleave', onMouseLeave);
        }

        return () => {
            if (element.current && element.current.parentElement) {
                const parentElement = element.current.parentElement;
                parentElement.removeEventListener('mouseenter', onMouseEnter);
                parentElement.removeEventListener('mouseleave', onMouseLeave);

                tooltip.remove(id.current);
            }
        };
    }, []);

    return (
        <div ref={element} className={styles['tooltip-placeholder']} />
    );
};

Tooltip.propTypes = {
    label: PropTypes.string.isRequired,
    position: PropTypes.string.isRequired,
    margin: PropTypes.number,
};

module.exports = Tooltip;
