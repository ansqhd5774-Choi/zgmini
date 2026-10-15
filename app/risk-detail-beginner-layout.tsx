import type {ReactNode} from "react";
import styles from "./risk-detail-beginner-layout.module.css";

export default function RiskDetailBeginnerLayout({children}:{children:ReactNode}){
 return <div className={styles.layout}>{children}</div>;
}
