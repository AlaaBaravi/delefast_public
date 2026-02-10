// app/routes/auth.login/route.jsx

import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const { redirectUrl, error } = await login(request);

  if (redirectUrl) {
    // Redirect to Shopify OAuth page
    throw redirect(redirectUrl);
  }

  return { error };
};

export default function App() {
  const { error } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>A short heading about [your app]</h1>
        <p className={styles.text}>
          A tagline about [your app] that describes your value proposition.
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <Form className={styles.form} method="post">
          <label className={styles.label}>
            <span>Shop domain</span>
            <input className={styles.input} type="text" name="shop" />
            <span>e.g: my-shop-domain.myshopify.com</span>
          </label>
          <button className={styles.button} type="submit">
            Log in
          </button>
        </Form>
      </div>
    </div>
  );
}
