import {useIsMobile} from './use-mobile';

// Detail pages keep their existing axes; only the mobile dashboard opts in.
export function useDashboardMobileAxis(){
 const mobile=useIsMobile();
 return mobile&&typeof document!=='undefined'&&!!document.querySelector('.zg-dashboard[data-view="dashboard"]');
}
