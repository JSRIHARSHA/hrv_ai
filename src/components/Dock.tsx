import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTheme } from '@mui/material';

type SpringOptions = {
  mass?: number;
  stiffness?: number;
  damping?: number;
  restDelta?: number;
  restSpeed?: number;
};

const DOCK_HEIGHT = 128;
const DEFAULT_MAGNIFICATION = 80;
const DEFAULT_DISTANCE = 150;
const DEFAULT_PANEL_HEIGHT = 64;

type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
};

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

type DocContextType = {
  mouseX: MotionValue;
  spring: SpringOptions;
  magnification: number;
  distance: number;
};

type DockProviderProps = {
  children: React.ReactNode;
  value: DocContextType;
};

const DockContext = createContext<DocContextType | undefined>(undefined);

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within an DockProvider');
  }
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
}: DockProps) {
  const theme = useTheme();
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(() => {
    return Math.max(DOCK_HEIGHT, magnification + magnification / 2 + 4);
  }, [magnification]);

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div
      style={{
        height: height,
        scrollbarWidth: 'none',
        overflow: 'visible',
      }}
      className={className}
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        style={{
          marginLeft: '8px',
          marginRight: '8px',
          display: 'flex',
          maxWidth: '100%',
          alignItems: 'flex-end',
          overflow: 'visible',
        }}
      >
        <motion.div
          style={{
            margin: '0 auto',
            display: 'flex',
            width: 'fit-content',
            gap: '16px',
            borderRadius: '16px',
            backgroundColor: isDark ? 'rgba(17, 17, 17, 0.9)' : 'rgba(249, 250, 251, 1)',
            padding: '16px',
            height: panelHeight,
            overflow: 'visible',
            position: 'relative',
          }}
          role="toolbar"
          aria-label="Application dock"
        >
          <DockProvider value={{ mouseX, spring, distance, magnification }}>
            {children}
          </DockProvider>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function DockItem({ children, className }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { distance, magnification, mouseX, spring } = useDock();

  const isHovered = useMotionValue(0);
  const [isHoveredState, setIsHoveredState] = useState(false);

  const mouseDistance = useTransform(mouseX, (val) => {
    const domRect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - domRect.x - domRect.width / 2;
  });

  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [40, magnification, 40]
  );

  const width = useSpring(widthTransform, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      onMouseEnter={() => {
        isHovered.set(1);
        setIsHoveredState(true);
      }}
      onMouseLeave={() => {
        isHovered.set(0);
        setIsHoveredState(false);
      }}
      onFocus={() => {
        isHovered.set(1);
        setIsHoveredState(true);
      }}
      onBlur={() => {
        isHovered.set(0);
        setIsHoveredState(false);
      }}
      className={className}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, (child) =>
        cloneElement(child as React.ReactElement, { width, isHovered, isHoveredState })
      )}
    </motion.div>
  );
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const theme = useTheme();
  const restProps = rest as Record<string, unknown>;
  const isHoveredState = restProps['isHoveredState'] as boolean | undefined;

  const isDark = theme.palette.mode === 'dark';

  if (!isHoveredState) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 10 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '8px',
        whiteSpace: 'nowrap',
        borderRadius: '6px',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        padding: '4px 8px',
        fontSize: '12px',
        color: isDark ? '#FFFFFF' : '#1a1a1a',
        zIndex: 10000,
        pointerEvents: 'none',
      }}
      role="tooltip"
    >
      {children}
    </motion.div>
  );
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>;
  const width = restProps['width'] as MotionValue<number> | undefined;
  const isHovered = restProps['isHovered'] as MotionValue<number> | undefined;
  const isHoveredState = restProps['isHoveredState'] as boolean | undefined;
  const fallbackWidth = useMotionValue(40);

  const widthTransform = useTransform(width || fallbackWidth, (val) => val / 2);

  return (
    <motion.div
      style={{ 
        width: widthTransform,
        position: 'relative',
      }}
      className={className}
    >
      {Children.map(children, (child) =>
        cloneElement(child as React.ReactElement, { isHovered, width, isHoveredState })
      )}
    </motion.div>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
