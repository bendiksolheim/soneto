import { Button } from "./button";

type MenuProps = {
  items: Array<MenuItem>;
};

export function Menu(props: MenuProps): React.ReactElement {
  return (
    <ul className="menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-md">
      {props.items.map((item) => (
        <li key={item.id}>
          {typeof item.action === "string" ? (
            <a href={item.action}>{item.label}</a>
          ) : (
            <Button variant="link" onClick={item.action} className="justify-start">
              {item.label}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

type MenuItem = {
  id: string;
  label: string;
  action: string | (() => void);
};
