#include <stdio.h>
#include <sys/socket.h>
#include <errno.h>
#include <stdlib.h>
#define PORT_MIN 0
#define PORT_MAX 65535

int send_all(int socket_fd, char *buffer, size_t length)
{
    size_t total_sent = 0;
    ssize_t bytes_sent;
    while (total_sent < length)
    {
        bytes_sent = send(socket_fd, buffer + total_sent, length - total_sent, 0);
        if (bytes_sent < 0)
        {
            if (errno == EINTR)
            {
                continue;
            }
            break;
        }
        total_sent += bytes_sent;
    }
    return total_sent;
}

ssize_t recv_with_error_handling(int socket_fd, char *buffer, int buffer_size)
{
    ssize_t bytes_received;
    bytes_received = recv(socket_fd, buffer, buffer_size - 1, 0);
    if (bytes_received == -1)
    {
        if (errno == EINTR)
        {
            return 0;
        }
        perror("Error receiving data /n");
        return -1;
    }
    if (bytes_received == 0)
    {
        puts("Connection closed by peer.");
        return -1;
    }
    buffer[bytes_received] = '\0';
    return bytes_received;
}

int recv_all(int socket_fd, char *buffer, int length)
{
    int total_received = 0;
    int bytes_remain = length;
    ssize_t bytes_received;

    while (total_received < length)
    {
        bytes_received = recv(socket_fd, buffer + total_received, bytes_remain, 0);
        if (bytes_received == -1)
        {
            break;
        }
        // 相手からコネクションを切られた場合に無限ループを防ぐ
        else if (bytes_received == 0)
        {
            puts("Connection closed by peer.");
            return -1;
        }

        total_received += bytes_received;
        bytes_remain -= bytes_received;
    }

    return total_received;
}

int valid_port(const char *port_str, int *port)
{
    char *strtol_endptr;
    long parsed_port = strtol(port_str, &strtol_endptr, 10);
    errno = 0;
    if (*strtol_endptr != '\0')
    {
        printf(" Invalid port number. Please enter a numeric value.: %s\n", strtol_endptr);
        return -1;
    }
    if (errno != ERANGE && !(PORT_MIN <= parsed_port && parsed_port <= PORT_MAX))
    {
        printf("Port number must be between %d and %d.: %ld\n", PORT_MIN, PORT_MAX, parsed_port);
        return -1;
    }
    *port = (int)parsed_port;
    return 0;
}

int create_socket()
{
    int socket_fd;
    socket_fd = socket(AF_INET6, SOCK_STREAM, 0);
    if (socket_fd < 0)
    {
        perror("Error creating socket /n");
        return -1;
    }
    return socket_fd;
}
