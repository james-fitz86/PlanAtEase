import { Link } from "react-router-dom"

export default function LogoutSuccess(){
    return (
        <div className="container" style={{ maxWidth: "500px", marginTop: "3rem" }}>
            <h1>You have successfully been logged out!</h1>
            <p>Click below to login.</p>
            <Link to="/login" className="btn btn-primary w-100">
                Login
            </Link>
        </div>
    )
}